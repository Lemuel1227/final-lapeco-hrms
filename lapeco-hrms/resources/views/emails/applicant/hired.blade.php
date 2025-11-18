<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Congratulations - You're Hired!</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial, Helvetica, sans-serif;color:#1f2933;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f7fb;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#1b8c67,#2ab884);padding:28px 32px;color:#ffffff;">
                            <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.4px;">Welcome to Lapeco!</h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">Your employment journey officially begins.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 32px 24px;">
                            <p style="margin:0 0 16px;font-size:16px;">Dear <strong>{{ $applicantName }}</strong>,</p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We are thrilled to confirm that you have been selected to join <strong>Lapeco Group of Companies</strong>. Your employee account is now active, and you can use the credentials below to access the HRMS.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <div style="background-color:#f0f5f3;border-radius:10px;padding:18px 20px;border:1px solid rgba(27,140,103,0.15);">
                                <p style="margin:0 0 12px;font-size:15px;color:#1b8c67;font-weight:600;">Your HRMS Credentials</p>
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;color:#1f2933;">
                                    <tr>
                                        <td style="padding:8px 12px;background:#ffffff;border-radius:8px;border-left:4px solid #1b8c67;margin-bottom:8px;display:block;">
                                            <strong>Employee ID:</strong> {{ $employeeId }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 12px;background:#ffffff;border-radius:8px;border-left:4px solid #1b8c67;margin-bottom:8px;display:block;">
                                            <strong>Username (Email):</strong> {{ $username }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 12px;background:#ffffff;border-radius:8px;border-left:4px solid #1b8c67;display:block;font-family:'Courier New',monospace;">
                                            <strong>Temporary Password:</strong> {{ $password }}
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin:16px 0 0;font-size:13px;color:#856404;background:#fff3cd;padding:12px 14px;border-radius:8px;border-left:4px solid #ffc107;">
                                    ⚠️ <strong>Security reminder:</strong> Please change your password immediately after your first login.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;font-weight:600;color:#1b8c67;">Next steps</p>
                            <ol style="margin:0;padding-left:20px;color:#1f2933;font-size:15px;line-height:1.6;">
                                <li>Log in to the HRMS using the credentials provided above.</li>
                                <li>Update your password and review your employee profile.</li>
                                <li>Complete any required onboarding tasks and documents.</li>
                                <li>Familiarize yourself with company policies and guidelines.</li>
                            </ol>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 32px;">
                            <p style="margin:0;font-size:15px;line-height:1.6;">If you have any questions or need support during onboarding, feel free to reply to this email and our HR team will gladly assist you.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 40px;">
                            <p style="margin:0;font-size:15px;line-height:1.6;">Warm regards,<br><strong>Lapeco HR Team</strong></p>
                            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">This email was sent automatically by Lapeco HRMS. If you believe you received it in error, please contact hr@lapeco.com.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
