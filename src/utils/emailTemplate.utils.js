export const EMAIL_VERIFICATION_TEMPLATE = (verificationLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, serif; background-color: #f8f0e3;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        <tr>
            <td align="center" bgcolor="#5d4037" style="padding: 30px 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to MurArt</h1>
            </td>
        </tr>
        <tr>
            <td bgcolor="#ffffff" style="padding: 40px 30px;">
                <h2 style="color: #3e2723; font-size: 22px;">Please Verify Your Email Address</h2>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    Thank you for signing up! To complete your registration and start collaborating, please click the button below to verify your email.
                </p>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <a href="${verificationLink}" target="_blank" style="background-color: #d4af37; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Verify Email</a>
                        </td>
                    </tr>
                </table>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    If you didn’t sign up for this account, you can safely ignore this email.
                </p>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    Best regards,<br>The MurArt Team
                </p>
            </td>
        </tr>
        <tr>
            <td bgcolor="#f8f0e3" style="padding: 20px 30px; text-align: center;">
                <p style="color: #a1887f; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            </td>
        </tr>
    </table>
</body>
</html>
`;


export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, serif; background-color: #f8f0e3;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        <tr>
            <td align="center" bgcolor="#5d4037" style="padding: 30px 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Changed Successfully</h1>
            </td>
        </tr>
        <tr>
            <td bgcolor="#ffffff" style="padding: 40px 30px;">
                <h2 style="color: #3e2723; font-size: 22px;">Your Password Has Been Reset</h2>
                <div style="text-align: center; margin: 20px 0;">
                  <div style="background-color: #4CAF50; color: white; width: 60px; height: 60px; line-height: 60px; border-radius: 50%; display: inline-block; font-size: 40px;">
                    ✓
                  </div>
                </div>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    This email confirms that the password for your MurArt account has been successfully changed.
                </p>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    If you did not make this change, please contact our support team immediately.
                </p>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    Best regards,<br>The MurArt Team
                </p>
            </td>
        </tr>
        <tr>
            <td bgcolor="#f8f0e3" style="padding: 20px 30px; text-align: center;">
                <p style="color: #a1887f; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export const PASSWORD_RESET_REQUEST_TEMPLATE = (resetLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, serif; background-color: #f8f0e3;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin-top: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        <tr>
            <td align="center" bgcolor="#5d4037" style="padding: 30px 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </td>
        </tr>
        <tr>
            <td bgcolor="#ffffff" style="padding: 40px 30px;">
                <h2 style="color: #3e2723; font-size: 22px;">Reset Your Password</h2>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    We received a request to reset the password for your account. If you didn't make this request, please ignore this email.
                </p>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <a href="${resetLink}" target="_blank" style="background-color: #d4af37; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
                        </td>
                    </tr>
                </table>
                <p style="color: #a1887f; font-size: 14px; text-align: center;">
                    For security reasons, this link will expire in 15 minutes.
                </p>
                <p style="color: #5d4037; font-size: 16px; line-height: 1.6;">
                    Best regards,<br>The MurArt Team
                </p>
            </td>
        </tr>
        <tr>
            <td bgcolor="#f8f0e3" style="padding: 20px 30px; text-align: center;">
                <p style="color: #a1887f; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            </td>
        </tr>
    </table>
</body>
</html>
`;