<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interview Scheduled - Lapeco HRMS</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial, Helvetica, sans-serif;color:#1f2933;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f7fb;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#1b4f8c,#2a75b8);padding:28px 32px;color:#ffffff;">
                            <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.4px;">Interview Scheduled</h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">Here are the details you need for your upcoming conversation.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 32px 24px;">
                            <p style="margin:0 0 16px;font-size:16px;">Dear <strong>{{ $applicantName }}</strong>,</p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thank you for your continued interest in joining <strong>Lapeco Group of Companies</strong>. We are pleased to confirm that an interview has been scheduled for your application. Please review the information below.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <div style="background-color:#eef4fb;border-radius:10px;padding:18px 20px;border:1px solid rgba(27,79,140,0.2);">
                                <p style="margin:0 0 12px;font-size:15px;color:#1b4f8c;font-weight:600;">Interview details</p>
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;color:#1f2933;">
                                    @if($interviewDate)
                                        <tr>
                                            <td style="padding:8px 12px;background:#ffffff;border-radius:8px;border-left:4px solid #1b4f8c;margin-bottom:8px;display:block;">
                                                <strong>Date:</strong> {{ $interviewDate }}
                                            </td>
                                        </tr>
                                    @endif
                                    @if($interviewTime)
                                        <tr>
                                            <td style="padding:8px 12px;background:#ffffff;border-radius:8px;border-left:4px solid #1b4f8c;margin-bottom:8px;display:block;">
                                                <strong>Time:</strong> {{ $interviewTime }}
                                            </td>
                                        </tr>
                                    @endif
                                    @if(!empty($interviewer))
                                        <tr>
                                            <td style="padding:8px 12px;background:#ffffff;border-radius:8px;border-left:4px solid #1b4f8c;margin-bottom:8px;display:block;">
                                                <strong>Interviewer:</strong> {{ $interviewer }}
                                            </td>
                                        </tr>
                                    @endif
                                    @if(!empty($location))
                                        <tr>
                                            <td style="padding:8px 12px;background:#ffffff;border-radius:8px;border-left:4px solid #1b4f8c;display:block;">
                                                <strong>Location / Meeting link:</strong> {{ $location }}
                                            </td>
                                        </tr>
                                    @endif
                                </table>
                                @if(!empty($notes))
                                    <p style="margin:16px 0 0;font-size:13px;color:#856404;background:#fff3cd;padding:12px 14px;border-radius:8px;border-left:4px solid #ffc107;">
                                        <strong>Additional notes:</strong> {{ $notes }}
                                    </p>
                                @endif
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Please plan to join the interview a few minutes early and ensure you are in a quiet environment. If you need to reschedule or have any questions, reply to this email and our HR team will be happy to help.</p>
                            <p style="margin:0;font-size:15px;line-height:1.6;">We look forward to speaking with you soon!</p>
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
