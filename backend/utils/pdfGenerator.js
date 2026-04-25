const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateODLetter = (student, event, hod, callback) => {
    const doc = new PDFDocument({ margin: 60 });
    const fileName = `OD_${student.register_number}_${event.id}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // ── Header ───────────────────────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold')
       .text('ON DUTY (OD) APPROVAL LETTER', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica')
       .text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });

    doc.moveDown(1.5);

    // ── Salutation ────────────────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').text('To Whom It May Concern,');
    doc.moveDown(0.8);

    // ── Body ──────────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(12).text(
        `This is to certify that `,
        { continued: true }
    )
    .font('Helvetica-Bold').text(`${student.name} `, { continued: true })
    .font('Helvetica').text(
        `(Register No: ${student.register_number}) from the ${student.department} Department ` +
        `is hereby granted Official Duty (OD) leave to participate in the following event:`
    );

    doc.moveDown(1);

    // ── Event Details Box ─────────────────────────────────────────────────────
    const boxX = 60;
    const boxY = doc.y;
    const boxW = doc.page.width - 120;

    doc.rect(boxX, boxY, boxW, 80).fillAndStroke('#f1f5f9', '#e2e8f0');
    doc.fillColor('#000000');

    doc.font('Helvetica-Bold').fontSize(11).text('Event Details', boxX + 15, boxY + 12);
    doc.font('Helvetica').fontSize(11)
       .text(`Event Name : ${event.title}`, boxX + 15, boxY + 28);
    doc.text(`Date          : ${new Date(event.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, boxX + 15, boxY + 44);

    const locationLabel = event.is_external
        ? `College       : ${event.college_name || 'External'}`
        : `Venue          : ${event.venue || 'On Campus'}`;
    doc.text(locationLabel, boxX + 15, boxY + 60);

    doc.y = boxY + 95;
    doc.moveDown(1);

    // ── Closing ───────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(12).text(
        `The student is permitted to be on official duty for the duration of the event and shall be marked present accordingly.`
    );

    doc.moveDown(2);

    // ── Approval Block (no signature lines) ──────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(12).text('Approved By:', { align: 'left' });
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(13)
       .fillColor('#4f46e5')
       .text(`${hod.name}`, { align: 'left' });
    doc.font('Helvetica').fontSize(11)
       .fillColor('#374151')
       .text(`${hod.department} – Head of Department`, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#6b7280')
       .text(`Digitally approved on ${new Date().toLocaleString('en-IN')}`, { align: 'left' });

    doc.end();

    writeStream.on('finish', () => callback(null, fileName));
    writeStream.on('error', (err) => callback(err, null));
};

exports.generatePermissionLetter = (student, permission, hod, callback) => {
    const doc = new PDFDocument({ margin: 60 });
    const fileName = `Permission_${student.register_number}_${permission.id}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const isLeave = permission.permission_type === 'leave';

    if (isLeave) {
        // ── Formal Leave Application ──────────────────────────────────────────────
        doc.fontSize(16).font('Helvetica-Bold')
           .text('LEAVE APPLICATION', { align: 'center', underline: true });
        doc.moveDown(1.5);

        doc.fontSize(11).font('Helvetica')
           .text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
        doc.moveDown(1);

        // From Block
        doc.font('Helvetica-Bold').text('From:');
        doc.font('Helvetica').text(`${student.name}`);
        doc.text(`Register No: ${student.register_number}`);
        doc.text(`Department of ${student.department}`);
        doc.moveDown(1);

        // To Block
        doc.font('Helvetica-Bold').text('To:');
        doc.font('Helvetica').text('The Head of Department,');
        doc.text(`Department of ${student.department}`);
        doc.moveDown(1.5);

        // Subject Line
        doc.font('Helvetica-Bold').text(`Subject: Leave of Absence Application - ${permission.reason}`);
        doc.moveDown(1);

        doc.font('Helvetica-Bold').text('Respected Sir/Madam,');
        doc.moveDown(0.5);

        // Date Bounds
        let leaveDatesStr = new Date(permission.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        if (permission.to_date && permission.to_date !== permission.date) {
            leaveDatesStr += ` to ${new Date(permission.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`;
        }
        
        let daysCount = '';
        if (permission.to_date && permission.to_date !== permission.date) {
            const ms = new Date(permission.to_date) - new Date(permission.date);
            const days = ms / (1000 * 60 * 60 * 24) + 1;
            daysCount = ` for ${days} days`;
        }

        // Body
        doc.font('Helvetica').fontSize(11.5).text(
            `I am writing to formally request a leave of absence${daysCount} from ${leaveDatesStr}. ` +
            `The reason for my leave is ${permission.reason.toLowerCase()}. ${permission.description ? permission.description + '.' : ''}`
        );
        doc.moveDown(0.5);
        doc.text(`I will ensure to catch up on any missed coursework and assignments. I kindly request you to approve my leave for the aforementioned dates.`);
        doc.moveDown(2);

        doc.text('Yours sincerely,');
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(`${student.name}`);
        doc.moveDown(3);

        // Approval Block Bottom
        const boxX = 60;
        const boxY = doc.y;
        const boxW = doc.page.width - 120;
        
        doc.rect(boxX, boxY, boxW, 0).dash(2, { space: 2 }).stroke('#cbd5e1'); // top dashed line
        doc.moveDown(1);
        doc.undash();
        
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('HOD APPROVAL DECISION', { align: 'center' });
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Status: ', boxX + 15).font('Helvetica').text('Approved', { continued: false });
        doc.font('Helvetica-Bold').text('Approved By: ', boxX + 15).font('Helvetica').fillColor('#4f46e5').text(`${hod.name} (${hod.department})`);
        doc.fillColor('#000000').font('Helvetica-Bold').text('Date: ', boxX + 15).font('Helvetica').text(`${new Date().toLocaleString('en-IN')}`);
        doc.font('Helvetica-Bold').text('Signature: ', boxX + 15).font('Helvetica').fillColor('#6b7280').text('Digitally Signed by HOD');
        
        doc.moveDown(1);
        doc.rect(boxX, doc.y, boxW, 0).dash(2, { space: 2 }).stroke('#cbd5e1'); // bottom dashed line

    } else {
        // ── Originally Styled Gate Pass ───────────────────────────────────────────────────────────────
        doc.fontSize(18).font('Helvetica-Bold')
           .text('OUT-PASS PERMISSION LETTER', { align: 'center' });
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica')
           .text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });

        doc.moveDown(1.5);

        doc.fontSize(12).font('Helvetica-Bold').text('To Security / Gate Incharge,');
        doc.moveDown(0.8);

        doc.font('Helvetica').fontSize(12).text(
            `This is to certify that `,
            { continued: true }
        )
        .font('Helvetica-Bold').text(`${student.name} `, { continued: true })
        .font('Helvetica').text(
            `(Register No: ${student.register_number}) from the ${student.department} Department ` +
            `is hereby granted permission to leave the campus premises for the following reason:`
        );

        doc.moveDown(1);

        const boxX = 60;
        const boxY = doc.y;
        const boxW = doc.page.width - 120;

        doc.rect(boxX, boxY, boxW, 100).fillAndStroke('#f1f5f9', '#e2e8f0');
        doc.fillColor('#000000');

        doc.font('Helvetica-Bold').fontSize(11).text('Permission Details', boxX + 15, boxY + 12);
        doc.font('Helvetica').fontSize(11)
           .text(`Reason        : ${permission.reason}`, boxX + 15, boxY + 32);
        doc.text(`Description : ${permission.description || 'N/A'}`, boxX + 15, boxY + 48);
        
        let boxDateStr = new Date(permission.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.text(`Date              : ${boxDateStr}`, boxX + 15, boxY + 64);
        
        let timeStr = `Time            : `;
        if (permission.out_time) timeStr += `Out: ${permission.out_time}`;
        if (permission.in_time) timeStr += ` | In: ${permission.in_time}`;
        if (!permission.out_time && !permission.in_time) timeStr += `Not specified`;
        
        doc.text(timeStr, boxX + 15, boxY + 80);

        doc.y = boxY + 115;
        doc.moveDown(1);

        doc.font('Helvetica').fontSize(12).text(`Please allow the student to proceed as approved.`);
        doc.moveDown(2);

        doc.font('Helvetica-Bold').fontSize(12).text('Approved By:', { align: 'left' });
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#4f46e5').text(`${hod.name}`, { align: 'left' });
        doc.font('Helvetica').fontSize(11).fillColor('#374151').text(`${hod.department} – Head of Department`, { align: 'left' });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#6b7280').text(`Digitally approved on ${new Date().toLocaleString('en-IN')}`, { align: 'left' });
    }

    doc.end();

    writeStream.on('finish', () => callback(null, fileName));
    writeStream.on('error', (err) => callback(err, null));
};
