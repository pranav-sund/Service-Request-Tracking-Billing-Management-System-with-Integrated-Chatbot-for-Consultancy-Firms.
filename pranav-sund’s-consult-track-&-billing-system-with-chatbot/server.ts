import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import PDFDocument from 'pdfkit';
import { GoogleGenAI } from '@google/genai';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'consultancy-super-secret';
const db = new Database('consultancy.db');

// --- DATABASE MIGRATIONS (Ensure columns exist for existing DBs) ---
const migrate = () => {
    const tableInfo = (table: string) => db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    
    // Users Table Migrations
    const userColumns = tableInfo('users').map(c => c.name);
    if (!userColumns.includes('address')) db.exec('ALTER TABLE users ADD COLUMN address TEXT');
    if (!userColumns.includes('gstin')) db.exec('ALTER TABLE users ADD COLUMN gstin TEXT');
    if (!userColumns.includes('pan')) db.exec('ALTER TABLE users ADD COLUMN pan TEXT');

    // Invoices Table Migrations
    const invoiceColumns = tableInfo('invoices').map(c => c.name);
    if (!invoiceColumns.includes('amount')) db.exec('ALTER TABLE invoices ADD COLUMN amount REAL DEFAULT 0');
    if (!invoiceColumns.includes('invoice_no')) db.exec('ALTER TABLE invoices ADD COLUMN invoice_no TEXT');
    if (!invoiceColumns.includes('invoice_date')) db.exec('ALTER TABLE invoices ADD COLUMN invoice_date TEXT');
    if (!invoiceColumns.includes('due_date')) db.exec('ALTER TABLE invoices ADD COLUMN due_date TEXT');
    if (!invoiceColumns.includes('batch_id')) db.exec('ALTER TABLE invoices ADD COLUMN batch_id TEXT');
    if (!invoiceColumns.includes('item_name')) db.exec('ALTER TABLE invoices ADD COLUMN item_name TEXT');
    if (!invoiceColumns.includes('sac_code')) db.exec("ALTER TABLE invoices ADD COLUMN sac_code TEXT DEFAULT '9983'");
    if (!invoiceColumns.includes('quantity')) db.exec('ALTER TABLE invoices ADD COLUMN quantity REAL DEFAULT 1');
    if (!invoiceColumns.includes('rate')) db.exec('ALTER TABLE invoices ADD COLUMN rate REAL DEFAULT 0');
    if (!invoiceColumns.includes('taxable_value')) db.exec('ALTER TABLE invoices ADD COLUMN taxable_value REAL DEFAULT 0');
    if (!invoiceColumns.includes('cgst')) db.exec('ALTER TABLE invoices ADD COLUMN cgst REAL DEFAULT 0');
    if (!invoiceColumns.includes('sgst')) db.exec('ALTER TABLE invoices ADD COLUMN sgst REAL DEFAULT 0');
    if (!invoiceColumns.includes('total_amount')) db.exec('ALTER TABLE invoices ADD COLUMN total_amount REAL DEFAULT 0');
    if (!invoiceColumns.includes('is_gst')) db.exec('ALTER TABLE invoices ADD COLUMN is_gst BOOLEAN DEFAULT 1');

    // Service Requests Table Migrations
    const requestColumns = tableInfo('service_requests').map(c => c.name);
    if (!requestColumns.includes('admin_report')) db.exec('ALTER TABLE service_requests ADD COLUMN admin_report TEXT');
};

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    organization TEXT,
    role TEXT DEFAULT 'client',
    address TEXT,
    gstin TEXT,
    pan TEXT
  );

  CREATE TABLE IF NOT EXISTS service_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed')),
    assigned_to INTEGER,
    admin_report TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    amount REAL DEFAULT 0,
    invoice_no TEXT,
    invoice_date TEXT,
    due_date TEXT,
    batch_id TEXT,
    item_name TEXT,
    sac_code TEXT DEFAULT '9983',
    quantity REAL DEFAULT 1,
    rate REAL NOT NULL,
    taxable_value REAL NOT NULL,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'Unpaid' CHECK(status IN ('Unpaid', 'Paid')),
    is_gst BOOLEAN DEFAULT 1,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(request_id) REFERENCES service_requests(id),
    FOREIGN KEY(client_id) REFERENCES users(id)
  );
`);

migrate();

function amountToWords(num: number): string {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numStr = Math.floor(num).toString().padStart(9, '0');
    const n = numStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return 'Zero Only';

    let str = '';
    const crore = parseInt(n[1]);
    const lakh = parseInt(n[2]);
    const thousand = parseInt(n[3]);
    const hundred = parseInt(n[4]);
    const remaining = parseInt(n[5]);

    if (crore > 0) str += (a[crore] || b[Math.floor(crore/10)] + ' ' + a[crore%10]) + 'Crore ';
    if (lakh > 0) str += (a[lakh] || b[Math.floor(lakh/10)] + ' ' + a[lakh%10]) + 'Lakh ';
    if (thousand > 0) str += (a[thousand] || b[Math.floor(thousand/10)] + ' ' + a[thousand%10]) + 'Thousand ';
    if (hundred > 0) str += a[hundred] + 'Hundred ';
    if (remaining > 0) {
        if (str !== '') str += 'and ';
        str += (a[remaining] || b[Math.floor(remaining/10)] + ' ' + a[remaining%10]);
    }
    
    return 'Rupees ' + (str.trim() || 'Zero') + ' Only';
}

// Add default admin if not exists
const adminCount = (db.prepare('SELECT count(*) as count FROM users WHERE role = ?').get('admin') as any).count;
if (adminCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, organization, role) VALUES (?, ?, ?, ?, ?)').run(
        'System Admin', 'admin@consultancy.com', hashedPassword, 'Consultancy Firm', 'admin'
    );
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Middleware for Auth
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
      const verified = jwt.verify(token, JWT_SECRET);
      req.user = verified;
      next();
    } catch (err) {
      res.status(400).json({ error: 'Invalid token' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  };

  // --- API Routes ---

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, organization, address, gstin, pan } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare('INSERT INTO users (name, email, password, organization, address, gstin, pan) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        name, email, hashedPassword, organization, address, gstin, pan
      );
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });

  // Auth: Logout (Placeholder, client clears localStorage)
  app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logged out' });
  });

  // Auth: Me
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Service Requests: Submit
  app.post('/api/requests', authenticateToken, (req: any, res) => {
    const { category, description } = req.body;
    const result = db.prepare('INSERT INTO service_requests (client_id, category, description) VALUES (?, ?, ?)').run(
      req.user.id, category, description
    );
    res.json({ id: result.lastInsertRowid });
  });

  // Service Requests: List (Client)
  app.get('/api/requests', authenticateToken, (req: any, res) => {
    const requests = db.prepare('SELECT * FROM service_requests WHERE client_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(requests);
  });

  // Service Requests: Delete (Client - Only if Pending)
  app.delete('/api/requests/:id', authenticateToken, (req: any, res) => {
    const id = parseInt(req.params.id);
    try {
        const request = db.prepare('SELECT status FROM service_requests WHERE id = ? AND client_id = ?').get(id, req.user.id) as any;
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'Pending') return res.status(400).json({ error: 'Only pending requests can be deleted' });

        db.prepare('DELETE FROM service_requests WHERE id = ?').run(id);
        res.json({ message: 'Request deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to delete request' });
    }
  });

  // Service Requests: List All (Admin)
  app.get('/api/admin/requests', authenticateToken, isAdmin, (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, u.name as client_name, u.organization 
      FROM service_requests r 
      JOIN users u ON r.client_id = u.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  // Service Requests: Update Status & Create Invoice (Admin)
  app.patch('/api/admin/requests/:id', authenticateToken, isAdmin, (req, res) => {
    const { status, invoiceData } = req.body;
    const id = req.params.id;
    
    console.log(`[AdminAction] Update status: ID=${id}, Status=${status}, HasInvoiceData=${!!invoiceData}`);

    const updateTx = db.transaction(() => {
        // 1. Update request status
        db.prepare('UPDATE service_requests SET status = ? WHERE id = ?').run(status, id);

        // 2. If completed, generate invoice
        if (status === 'Completed' && invoiceData) {
          const { 
            invoice_no, invoice_date, due_date, batch_id, 
            item_name, sac_code, quantity, rate, is_gst 
          } = invoiceData;
          
          const taxable_value = quantity * rate;
          let cgst = 0, sgst = 0;
          if (is_gst) {
              cgst = taxable_value * 0.09;
              sgst = taxable_value * 0.09;
          }
          const total_amount = taxable_value + cgst + sgst;
          
          const request = db.prepare('SELECT client_id FROM service_requests WHERE id = ?').get(id) as any;
          
          if (!request) {
              throw new Error(`Request ID ${id} not found.`);
          }

          console.log(`[InvoiceGeneration] Creating invoice for Request ${id}, Client ID ${request.client_id}`);

          db.prepare(`
            INSERT INTO invoices (
                request_id, client_id, amount, invoice_no, invoice_date, due_date, batch_id,
                item_name, sac_code, quantity, rate, taxable_value, cgst, sgst, total_amount, is_gst
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id, request.client_id, total_amount, invoice_no, invoice_date, due_date, batch_id,
            item_name, sac_code, quantity, rate, taxable_value, cgst, sgst, total_amount, is_gst ? 1 : 0
          );
          
          console.log(`[InvoiceGeneration] Success: Invoice created for client ${request.client_id}`);
        }
    });

    try {
        updateTx();
        res.json({ message: 'Status and invoice updated successfully' });
    } catch (err: any) {
        console.error('[AdminAction] Error in status update transaction:', err);
        res.status(500).json({ error: 'Database transaction failed', details: err.message });
    }
  });

  // Admin: Update Request Details (Admin Report, category, description)
  app.patch('/api/admin/requests/:id/details', authenticateToken, isAdmin, (req, res) => {
    const { category, description, admin_report, status } = req.body;
    const id = req.params.id;
    
    try {
        db.prepare(`
            UPDATE service_requests 
            SET category = ?, description = ?, admin_report = ?, status = ? 
            WHERE id = ?
        `).run(category, description, admin_report, status, id);
        res.json({ message: 'Request updated successfully' });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to update request', details: err.message });
    }
  });

  // Service Requests: Delete (Admin)
  app.delete('/api/admin/requests/:id', authenticateToken, isAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    console.log('[AdminAction] Deleting request ID:', id);
    try {
        db.transaction(() => {
            db.prepare('DELETE FROM invoices WHERE request_id = ?').run(id);
            db.prepare('DELETE FROM service_requests WHERE id = ?').run(id);
        })();
        res.json({ message: 'Request deleted successfully' });
    } catch (err: any) {
        console.error('[AdminAction] Request delete error:', err);
        res.status(500).json({ error: 'Failed to delete request', details: err.message });
    }
  });

  // Admin: User Management - List
  app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    const users = db.prepare('SELECT id, name, email, organization, role, address, gstin, pan FROM users').all();
    res.json(users);
  });

  // Admin: User Management - Create
  app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    const { name, email, password, organization, role, address, gstin, pan } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.prepare(`
            INSERT INTO users (name, email, password, organization, role, address, gstin, pan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, email, hashedPassword, organization || '', role || 'client', address || '', gstin || '', pan || '');
        res.status(201).json({ message: 'User created' });
    } catch (err: any) {
        res.status(400).json({ error: 'Email already exists' });
    }
  });

  // Admin: User Management - Update
  app.patch('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { name, email, organization, role, address, gstin, pan, password } = req.body;
    const id = req.params.id;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
        }
        db.prepare(`
            UPDATE users SET name = ?, email = ?, organization = ?, role = ?, address = ?, gstin = ?, pan = ?
            WHERE id = ?
        `).run(name, email, organization, role, address, gstin, pan, id);
        res.json({ message: 'User updated' });
    } catch (err: any) {
        res.status(400).json({ error: 'Update failed', details: err.message });
    }
  });

  // Admin: User Management - Delete
  app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    console.log('[AdminAction] Deleting user ID:', id);
    try {
        const deleteTx = db.transaction(() => {
            // Delete associated invoices first
            db.prepare('DELETE FROM invoices WHERE client_id = ?').run(id);
            // Delete associated requests
            db.prepare('DELETE FROM service_requests WHERE client_id = ?').run(id);
            // Finally delete the user
            db.prepare('DELETE FROM users WHERE id = ?').run(id);
        });
        deleteTx();
        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (err: any) {
        console.error('[AdminAction] User delete error:', err);
        res.status(500).json({ error: 'Failed to delete user and associated records', details: err.message });
    }
  });

  // Invoices: List All (Admin)
  app.get('/api/admin/invoices', authenticateToken, isAdmin, (req, res) => {
    try {
        const invoices = db.prepare(`
          SELECT i.*, r.category, u.name as client_name, u.organization
          FROM invoices i 
          JOIN service_requests r ON i.request_id = r.id 
          JOIN users u ON i.client_id = u.id
          ORDER BY i.generated_at DESC
        `).all();
        res.json(invoices);
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Invoices: Update Status (Admin)
  app.patch('/api/admin/invoices/:id/status', authenticateToken, isAdmin, (req, res) => {
    const { status } = req.body;
    const id = req.params.id;
    
    if (!['Paid', 'Unpaid'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id);
        res.json({ message: 'Invoice status updated successfully' });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
  });

  // Invoices: Update Due Date (Admin)
  app.patch('/api/admin/invoices/:id/due-date', authenticateToken, isAdmin, (req, res) => {
    const { due_date } = req.body;
    const id = req.params.id;
    
    if (!due_date) {
        return res.status(400).json({ error: 'Due date is required' });
    }

    try {
        db.prepare('UPDATE invoices SET due_date = ? WHERE id = ?').run(due_date, id);
        res.json({ message: 'Due date updated successfully' });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to update due date' });
    }
  });

  // Invoices: Delete (Admin)
  app.delete('/api/admin/invoices/:id', authenticateToken, isAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    console.log('[AdminAction] Deleting invoice ID:', id);
    try {
        db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
        res.json({ message: 'Invoice deleted successfully' });
    } catch (err: any) {
        console.error('[AdminAction] Invoice delete error:', err);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  // Invoices: List (Client)
  app.get('/api/invoices', authenticateToken, (req: any, res) => {
    const clientId = parseInt(req.user.id);
    console.log(`[ClientAction] Fetching invoices for client ID: ${clientId} (${typeof clientId})`);
    
    try {
        const invoices = db.prepare(`
          SELECT i.*, r.category 
          FROM invoices i 
          JOIN service_requests r ON i.request_id = r.id 
          WHERE i.client_id = ? 
          ORDER BY i.generated_at DESC
        `).all(clientId);
        
        console.log(`[ClientAction] Found ${invoices.length} invoices for client ${clientId}`);
        res.json(invoices);
    } catch (err: any) {
        console.error('[ClientAction] Error fetching invoices:', err);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Invoices: PDF Download (Indian Tax Invoice Format)
  app.get('/api/invoices/:id/pdf', authenticateToken, (req: any, res) => {
    const invoiceId = req.params.id;
    const invoice = db.prepare(`
      SELECT i.*, r.category, r.description as req_desc, u.name, u.email, u.organization, u.address as client_address, u.gstin as client_gstin
      FROM invoices i 
      JOIN service_requests r ON i.request_id = r.id 
      JOIN users u ON i.client_id = u.id
      WHERE i.id = ?
    `).get(invoiceId) as any;

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (req.user.role !== 'admin' && invoice.client_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_no || invoiceId}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('TAX INVOICE', { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(16).text('CONSULTANCY SERVICES INC.', { align: 'center' });
    doc.fontSize(10).text('123 Business Hub, Connaught Place, New Delhi - 110001', { align: 'center' });
    doc.text('GSTIN: 07AAAAA0000A1Z5 | PAN: ABCDE1234F', { align: 'center' });
    doc.moveDown();

    const top = 160;
    // Bill To
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, top);
    doc.font('Helvetica').text(invoice.organization || invoice.name, 50, top + 15);
    doc.text(invoice.client_address || 'No Address Provided', 50, top + 30, { width: 200 });
    doc.text(`GSTIN: ${invoice.client_gstin || 'N/A'}`, 50, top + 60);

    // Invoice Meta
    doc.font('Helvetica-Bold').text('Invoice No:', 350, top);
    doc.font('Helvetica').text(invoice.invoice_no || `INV-${invoice.id}`, 430, top);
    doc.font('Helvetica-Bold').text('Date:', 350, top + 15);
    doc.font('Helvetica').text(invoice.invoice_date || invoice.generated_at.split(' ')[0], 430, top + 15);
    doc.font('Helvetica-Bold').text('Due Date:', 350, top + 30);
    doc.font('Helvetica').text(invoice.due_date || 'N/A', 430, top + 30);
    doc.font('Helvetica-Bold').text('Batch ID:', 350, top + 45);
    doc.font('Helvetica').text(invoice.batch_id || 'N/A', 430, top + 45);

    doc.moveDown(4);

    // Table Header
    const tableTop = 270;
    doc.font('Helvetica-Bold');
    doc.text('Item Name', 50, tableTop);
    doc.text('SAC', 200, tableTop);
    doc.text('Qty', 240, tableTop);
    doc.text('Rate', 280, tableTop);
    doc.text('Taxable', 340, tableTop);
    doc.text('CGST(9%)', 400, tableTop);
    doc.text('SGST(9%)', 460, tableTop);
    doc.text('Total', 520, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    // Table Content
    const rowTop = tableTop + 25;
    doc.font('Helvetica');
    doc.text(invoice.item_name || invoice.category, 50, rowTop, { width: 140 });
    doc.text(invoice.sac_code || '9983', 200, rowTop);
    doc.text(invoice.quantity.toString(), 240, rowTop);
    doc.text(invoice.rate.toFixed(2), 280, rowTop);
    doc.text(invoice.taxable_value.toFixed(2), 340, rowTop);
    doc.text(invoice.cgst.toFixed(2), 400, rowTop);
    doc.text(invoice.sgst.toFixed(2), 460, rowTop);
    doc.text(invoice.total_amount.toFixed(2), 520, rowTop);

    doc.moveTo(50, rowTop + 20).lineTo(560, rowTop + 20).stroke();

    // Totals
    const footerTop = 400;
    doc.fontSize(11).font('Helvetica-Bold').text(`Total Amount: Rs. ${invoice.total_amount.toFixed(2)}`, 350, footerTop, { align: 'right', width: 210 });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Oblique').text(`Amount in Words: ${amountToWords(invoice.total_amount)}`, 50, footerTop + 30);

    // QR Code Placeholder
    doc.rect(50, footerTop + 60, 80, 80).stroke();
    doc.fontSize(8).text('Scan to Pay', 65, footerTop + 145);

    // Bank Details
    const bankTop = footerTop + 60;
    doc.fontSize(9).font('Helvetica-Bold').text('Bank Details:', 150, bankTop);
    doc.font('Helvetica');
    doc.text('Account Name: Consultancy Services Inc.', 150, bankTop + 15);
    doc.text('Account Number: 987654321000', 150, bankTop + 30);
    doc.text('IFSC Code: ICIC0001234', 150, bankTop + 45);
    doc.text('Account Type: Current Account', 150, bankTop + 60);

    // Signature
    doc.fontSize(10).font('Helvetica-Bold').text('Authorized Signatory', 400, bankTop + 80);
    doc.rect(400, bankTop + 40, 150, 40).stroke(); // Signature box

    // Terms & Conditions
    doc.moveDown(8);
    doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:');
    const terms = [
      '1. E.& O.E.',
      '2. Payment is due within 15 days from the invoice date unless otherwise agreed in writing.',
      '3. Interest @12% p.m. will be levied on delayed payments.',
      '4. Services rendered are non-refundable and subject to agreed scope only.',
      '5. All disputes are subject to jurisdiction of courts in Delhi, India.',
      '6. Please quote invoice number when remitting funds.'
    ];
    terms.forEach((term, index) => {
      doc.font('Helvetica').text(term, 50, doc.y + 2);
    });

    doc.end();
  });

  // Reporting (Admin)
  app.get('/api/admin/reports', authenticateToken, isAdmin, (req, res) => {
    const totalRequests = db.prepare('SELECT count(*) as count FROM service_requests').get() as any;
    const completedRequests = db.prepare("SELECT count(*) as count FROM service_requests WHERE status = 'Completed'").get() as any;
    const totalRevenue = db.prepare('SELECT sum(total_amount) as sum FROM invoices').get() as any;
    const revenueByCategory = db.prepare(`
        SELECT r.category, sum(i.total_amount) as revenue 
        FROM invoices i 
        JOIN service_requests r ON i.request_id = r.id 
        GROUP BY r.category
    `).all();

    res.json({
        totalRequests: totalRequests.count,
        completedRequests: completedRequests.count,
        totalRevenue: totalRevenue.sum || 0,
        revenueByCategory
    });
  });

// Chatbot Context Endpoint (Simplified)
  app.get('/api/chatbot/context', authenticateToken, (req: any, res) => {
    const userRequests = db.prepare('SELECT * FROM service_requests WHERE client_id = ?').all(req.user.id);
    const userInvoices = db.prepare('SELECT * FROM invoices WHERE client_id = ?').all(req.user.id);
    res.json({ userRequests, userInvoices });
  });

  // --- Serve Frontend ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
