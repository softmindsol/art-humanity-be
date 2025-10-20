// utils/pdf.utils.js
import PDFDocument from 'pdfkit';
import fs from 'fs'; // File System module (logo parhne ke liye)
import path from 'path'; // Path module (sahi file path banane ke liye)

// Helper function jo ek line banayega
const generateHr = (doc, y) => {
    doc.strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
};

export const generateInvoicePdf = (payment, user, project) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- PDF CONTENT (Naya aur Behtar Format) ---

        // 1. Header (Logo aur Title)
        try {
            // Apne logo ka sahi path dein
            const logoPath = path.resolve('./public/logo.png'); // Farz karein logo yahan hai
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 50 });
            }
        } catch (e) {
            console.error("Could not load logo for PDF:", e);
        }

        doc.fontSize(20)
            .text('Payment Receipt', 110, 57, { align: 'right' });

        generateHr(doc, 100);

        // 2. Customer aur Invoice ki Details
        const customerInfoTop = 120;
        doc.fontSize(10);
        doc.text(`Invoice Number:`, 50, customerInfoTop);
        doc.font('Helvetica-Bold').text(payment._id.toString(), 150, customerInfoTop);
        doc.font('Helvetica');

        doc.text(`Payment ID:`, 50, customerInfoTop + 15);
        doc.text(payment.stripePaymentIntentId, 150, customerInfoTop + 15);

        doc.text(`Payment Date:`, 50, customerInfoTop + 30);
        doc.text(payment.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 150, customerInfoTop + 30);

        doc.font('Helvetica-Bold')
            .text('Billed To:', 350, customerInfoTop);
        doc.font('Helvetica');
        doc.text(user.fullName, 350, customerInfoTop + 15);
        doc.text(user.email, 350, customerInfoTop + 30);

        generateHr(doc, 180);

        // 3. Item Details (Table jaisa look)
        const invoiceTableTop = 200;
        doc.font('Helvetica-Bold');
        doc.text('Item Description', 50, invoiceTableTop);
        doc.text('Amount', 450, invoiceTableTop, { width: 100, align: 'right' });
        doc.font('Helvetica');

        generateHr(doc, invoiceTableTop + 20);

        const itemTop = invoiceTableTop + 30;
        let itemDescription = '';
        if (payment.paymentType === 'project_purchase' && project) {
            itemDescription = `Digital Download: "${project.title}"`;
        } else {
            itemDescription = 'Donation to MurArt';
        }

        doc.text(itemDescription, 50, itemTop);
        doc.text(`$${payment.amount.toFixed(2)}`, 450, itemTop, { width: 100, align: 'right' });

        generateHr(doc, itemTop + 20);

        // 4. Total Amount
        const totalTop = itemTop + 40;
        doc.font('Helvetica-Bold');
        doc.text('Total Paid:', 50, totalTop, { align: 'right', width: 400 });
        doc.text(`$${payment.amount.toFixed(2)}`, 0, totalTop, { align: 'right' });
        doc.font('Helvetica');

        doc.moveDown(4);

        // 5. Thank You Note
        doc.fontSize(12).text('Thank you for your support!', { align: 'center' });

        // 6. Footer (Metadata aur Company ki Details)
        doc.fontSize(8)
            .text(
                'MurArt | https://murart.io | support@art-humanity.com',
                50, 750, { align: 'center', link: 'https://murart.io', underline: true }
            );

        // PDF ko final karein
        doc.end();
    });
};