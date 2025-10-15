# Lapeco System

A comprehensive HR Management System with separated backend (Laravel API) and frontend (React).

## Project Structure

```
lapeco-system/
├── app/                    # Laravel backend application
├── database/              # Database migrations and seeders
├── routes/                # API routes
├── config/                # Laravel configuration
├── frontend/              # React frontend application
│   ├── js/               # React components and logic
│   ├── css/              # Stylesheets
│   ├── package.json      # Frontend dependencies
│   └── vite.config.js    # Vite configuration
└── README.md
```

## Backend (Laravel API)

The backend is a RESTful API built with Laravel 12 and Laravel Sanctum for authentication.

### Features
- Employee Management
- Position Management
- Schedule Management
- Leave Management
- Payroll Management
- Holiday Management
- Recruitment
- Performance Management
- Training & Development
- Reports

### Setup
1. Install PHP dependencies:
   ```bash
   composer install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Generate application key:
   ```bash
   php artisan key:generate
   ```

4. Configure database in `.env`

5. Run migrations:
   ```bash
   php artisan migrate
   ```

6. Start the server:
   ```bash
   php artisan serve
   ```

The API will be available at `http://localhost:8000/api`

## Frontend (React)

The frontend is a React application built with Vite, featuring a modern UI with Tailwind CSS and Bootstrap.

### Features
- Responsive design
- Modern UI components
- State management
- API integration
- Routing with React Router

### Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## API Documentation

Visit `http://localhost:8000` to see the API documentation.

## Authentication

The system uses Laravel Sanctum for API authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer {your-token}
```

## Development

### Backend Development
- Run `php artisan serve` to start the Laravel server
- API endpoints are defined in `routes/api.php`
- Controllers are in `app/Http/Controllers/`

### Frontend Development
- Run `npm run dev` in the frontend directory
- The frontend proxies API calls to the Laravel backend
- Components are in `frontend/js/pages/` and `frontend/js/layout/`

## Technologies Used

### Backend
- Laravel 12
- Laravel Sanctum
- MySQL/PostgreSQL
- PHP 8.2+

### Frontend
- React 18
- Vite
- Tailwind CSS
- Bootstrap
- React Router
- Axios

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
"# lapeco-hrms" 
