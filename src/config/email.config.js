import dotenv from 'dotenv'
dotenv.config()
import nodemailer from 'nodemailer';

// Common function to send emails
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL, // your Gmail address
        pass: process.env.PASSWORD, // your Gmail password or app password
      },
    });

    // email options
    let mailOptions = {
      from: `"Shiki " <${process.env.EMAIL}>`, // sender address
      to: to, // recipient
      subject: subject, // email subject
      text,
      html, // email body
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    // eslint-disable-next-line
  } catch (error) {
    throw error; // Propagate the error to handle it at the controller level
  }
};