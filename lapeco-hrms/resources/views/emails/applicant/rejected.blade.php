<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Rejected - Lapeco HRMS</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial, Helvetica, sans-serif;color:#1f2933;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f7fb;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#8c1b3d,#b82a54);padding:28px 32px;color:#ffffff;">
                            <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.4px;">Application Rejected</h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">Thank you for your interest in Lapeco.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 32px 24px;">
                            <p style="margin:0 0 16px;font-size:16px;">Dear <strong>{{ $applicantName }}</strong>,</p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We appreciate the time and effort you invested in your application. After careful consideration, we regret to inform you that we will not be moving forward with your candidacy at this time.</p>
                            <p style="margin:0;font-size:15px;line-height:1.6;">We sincerely value your interest in <strong>Lapeco Group of Companies</strong> and encourage you to stay connected with us for future opportunities.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <div style="background-color:#fbeff2;border-radius:10px;padding:18px 20px;border:1px solid rgba(184,42,84,0.2);">
                                <p style="margin:0;font-size:14px;color:#8c1b3d;line-height:1.6;">
                                    <strong>Feedback</strong><br>
                                    @if(!empty($notes))
                                        {{ $notes }}
                                    @else
                                        While we are unable to provide individual feedback for every application, please know that your profile will remain on file for future roles that may be a better fit.
                                    @endif
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 40px;">
                            <p style="margin:0;font-size:15px;line-height:1.6;">Thank you again for considering a career with Lapeco. We wish you every success in your job search and future endeavors.</p>
                            <p style="margin:16px 0 0;font-size:15px;line-height:1.6;">Warm regards,<br><strong>Lapeco HR Team</strong></p>
                            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">This email was sent automatically by Lapeco HRMS. If you believe you received it in error, please contact hr@lapeco.com.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
