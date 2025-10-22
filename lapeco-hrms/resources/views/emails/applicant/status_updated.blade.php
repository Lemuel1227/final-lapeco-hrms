<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Status Update</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial, Helvetica, sans-serif;color:#1f2933;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f7fb;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#1b4f8c,#2a75b8);padding:28px 32px;color:#ffffff;">
                            <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.4px;">Application Status Update</h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">We wanted to keep you informed on your progress.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 32px 24px;">
                            <p style="margin:0 0 16px;font-size:16px;">Dear <strong>{{ $applicantName }}</strong>,</p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We are writing to let you know that your application status has been updated to <strong>{{ $status }}</strong>. Our team is continuing the evaluation process and will reach out to you with any further updates.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <div style="background-color:#eef4fb;border-radius:10px;padding:18px 20px;border:1px solid rgba(27,79,140,0.2);">
                                <p style="margin:0;font-size:14px;color:#1b4f8c;line-height:1.6;">
                                    <strong>Status details</strong><br>
                                    Status: {{ $status }}<br>
                                    @if(!empty($notes))
                                        Notes: {{ $notes }}
                                    @else
                                        Our HR team will share additional details soon.
                                    @endif
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 32px;">
                            <p style="margin:0;font-size:15px;line-height:1.6;">If you have any questions or require more information, feel free to reply to this email and we will be glad to assist you.</p>
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
