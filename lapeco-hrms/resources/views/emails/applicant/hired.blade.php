<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Congratulations - You're Hired!</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #28a745;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
        }
        .credentials-box {
            background-color: #fff;
            border: 2px solid #28a745;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-item {
            margin: 10px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-left: 3px solid #28a745;
        }
        .credential-label {
            font-weight: bold;
            color: #28a745;
        }
        .credential-value {
            font-family: 'Courier New', monospace;
            font-size: 16px;
            color: #333;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Congratulations!</h1>
        <p>You've Been Hired at Lapeco Group of Companies</p>
    </div>
    
    <div class="content">
        <p>Dear {{ $applicantName }},</p>
        
        <p>We are thrilled to inform you that you have been selected to join our team at <strong>Lapeco Group of Companies</strong>!</p>
        
        <p>Your employee account has been created. Below are your login credentials to access the HRMS system:</p>
        
        <div class="credentials-box">
            <h3 style="margin-top: 0; color: #28a745;">Your Account Details</h3>
            
            <div class="credential-item">
                <div class="credential-label">Employee ID:</div>
                <div class="credential-value">{{ $employeeId }}</div>
            </div>
            
            <div class="credential-item">
                <div class="credential-label">Username (Email):</div>
                <div class="credential-value">{{ $username }}</div>
            </div>
            
            <div class="credential-item">
                <div class="credential-label">Temporary Password:</div>
                <div class="credential-value">{{ $password }}</div>
            </div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important:</strong> Please change your password immediately after your first login for security purposes.
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Log in to the HRMS system using the credentials above</li>
            <li>Change your temporary password</li>
            <li>Complete your employee profile</li>
            <li>Review company policies and procedures</li>
        </ol>
        
        <p>We look forward to having you as part of our team!</p>
        
        <p>Best regards,<br>
        <strong>Human Resources Department</strong><br>
        Lapeco Group of Companies</p>
    </div>
    
    <div class="footer">
        <p>This is an automated email from Lapeco HRMS. Please do not reply to this email.</p>
        <p>&copy; {{ date('Y') }} Lapeco Group of Companies. All rights reserved.</p>
    </div>
</body>
</html>
