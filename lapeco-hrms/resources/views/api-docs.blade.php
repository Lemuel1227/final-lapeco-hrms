<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lapeco System API</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .endpoint {
            background: #f8f9fa;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
        }
        .get { background: #28a745; color: white; }
        .post { background: #007bff; color: white; }
        .put { background: #ffc107; color: black; }
        .delete { background: #dc3545; color: white; }
        .url {
            font-family: monospace;
            background: #e9ecef;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .description {
            color: #6c757d;
            margin-top: 10px;
        }
        .auth-required {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Lapeco System API Documentation</h1>
        
        <p>Welcome to the Lapeco System API. This is a RESTful API for managing HR operations including employee data, schedules, payroll, and more.</p>
        
        <h2>Base URL</h2>
        <p><code>{{ url('/api') }}</code></p>
        
        <h2>Authentication</h2>
        <p>Most endpoints require authentication using Laravel Sanctum. Include the Bearer token in the Authorization header:</p>
        <p><code>Authorization: Bearer {your-token}</code></p>
        
        <h2>Endpoints</h2>
        
        <div class="endpoint">
            <span class="method post">POST</span>
            <div class="url">/api/login</div>
            <div class="description">Authenticate user and get access token</div>
        </div>
        
        <div class="endpoint">
            <span class="method post">POST</span>
            <div class="url">/api/register</div>
            <div class="description">Register a new user</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/dashboard</div>
            <div class="description">Get dashboard data for authenticated user</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/employees</div>
            <div class="description">Get all employees</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/positions</div>
            <div class="description">Get all positions</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/schedules</div>
            <div class="description">Get all schedules</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/leaves</div>
            <div class="description">Get all leave requests</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/payroll</div>
            <div class="description">Get payroll information</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/holidays</div>
            <div class="description">Get all holidays</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/recruitment</div>
            <div class="description">Get recruitment data</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/performance</div>
            <div class="description">Get performance evaluations</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/training</div>
            <div class="description">Get training programs</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <div class="url">/api/reports</div>
            <div class="description">Get system reports</div>
            <div class="auth-required">🔒 Authentication required</div>
        </div>
        
        <h2>Frontend</h2>
        <p>The React frontend has been moved to a separate project. You can find it in the <code>frontend/</code> directory.</p>
        
        <h2>Getting Started</h2>
        <ol>
            <li>Start the Laravel backend: <code>php artisan serve</code></li>
            <li>Navigate to the frontend directory: <code>cd frontend</code></li>
            <li>Install dependencies: <code>npm install</code></li>
            <li>Start the frontend: <code>npm start</code></li>
        </ol>
    </div>
</body>
</html>
