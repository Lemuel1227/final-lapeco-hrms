# Activity Logs Feature

## Overview
The Activity Logs feature allows HR users to view their account activity history and track actions performed on the system. This includes login/logout events and other system activities.

## Features Implemented

### Backend

1. **Database Migration** (`2025_10_26_150000_create_user_activity_logs_table.php`)
   - Creates `user_activity_logs` table
   - Tracks: user_id, action_type, entity_type, entity_id, description, ip_address, user_agent, metadata
   - Includes indexes for optimal query performance

2. **UserActivityLog Model** (`app/Models/UserActivityLog.php`)
   - Eloquent model with relationships
   - Static `log()` method for easy activity logging
   - Automatic IP address and user agent capture

3. **LogsActivity Trait** (`app/Traits/LogsActivity.php`)
   - Reusable trait for controllers
   - Helper methods: `logCreate()`, `logUpdate()`, `logDelete()`, `logView()`, `logExport()`
   - Automatically captures authenticated user information

4. **SessionController Updates** (`app/Http/Controllers/SessionController.php`)
   - `getActivityLogs()` - Get user's own activity logs with filtering
   - `getAllActivityLogs()` - Get all users' activity logs (HR/Admin only)
   - `getActionTypes()` - Get available action types for filters
   - `getEntityTypes()` - Get available entity types for filters

5. **API Routes** (`routes/api.php`)
   - `GET /api/activity-logs` - User's own logs
   - `GET /api/activity-logs/all` - All users' logs (HR only)
   - `GET /api/activity-logs/action-types` - Filter options
   - `GET /api/activity-logs/entity-types` - Filter options

6. **Authentication Logging** (`app/Http/Controllers/Auth/AuthenticatedSessionController.php`)
   - Automatic login activity logging
   - Automatic logout activity logging

### Frontend

1. **Account Service Updates** (`frontend/js/services/accountService.js`)
   - `getActivityLogs(params)` - Fetch user's activity logs
   - `getAllActivityLogs(params)` - Fetch all activity logs (HR only)
   - `getActionTypes()` - Get filter options
   - `getEntityTypes()` - Get filter options

2. **ActivityLogs Component** (`frontend/js/pages/Account-Settings/ActivityLogs.jsx`)
   - Display activity logs in a table format
   - Filter by action type, entity type, date range
   - Pagination support
   - Color-coded action badges
   - Relative and absolute timestamps
   - IP address display

3. **Account Settings Integration** (`frontend/js/pages/Account-Settings/AccountSettingsPage.jsx`)
   - Added "Activity Logs" section to account settings
   - Available to all authenticated users

## Usage

### For End Users
1. Navigate to Account Settings
2. Click on "Activity Logs" in the sidebar
3. View your activity history
4. Use filters to narrow down results:
   - Filter by action type (login, logout, create, update, delete, etc.)
   - Filter by entity type (employee, payroll, leave, etc.)
   - Filter by date range
5. Navigate through pages if you have many activities

### For Developers

#### Logging Activities in Controllers

**Option 1: Use the LogsActivity Trait**

```php
use App\Traits\LogsActivity;

class YourController extends Controller
{
    use LogsActivity;
    
    public function store(Request $request)
    {
        $employee = Employee::create($data);
        
        // Log the create action
        $this->logCreate('employee', $employee->id, $employee->full_name);
        
        return response()->json($employee);
    }
    
    public function update(Request $request, Employee $employee)
    {
        $employee->update($data);
        
        // Log the update action with changes
        $this->logUpdate('employee', $employee->id, $employee->full_name, $request->only(['salary', 'position']));
        
        return response()->json($employee);
    }
}
```

**Option 2: Use the Model Directly**

```php
use App\Models\UserActivityLog;

UserActivityLog::log(
    userId: Auth::id(),
    actionType: 'export',
    description: 'Exported payroll report for October 2025',
    entityType: 'payroll',
    metadata: ['month' => 'October', 'year' => 2025]
);
```

#### Available Action Types
- `login` - User login
- `logout` - User logout
- `create` - Create new record
- `update` - Update existing record
- `delete` - Delete record
- `view` - View record details
- `export` - Export data
- Custom types as needed

## Database Schema

```sql
user_activity_logs
  - id (bigint, primary key)
  - user_id (bigint, foreign key to users)
  - action_type (string)
  - entity_type (string, nullable)
  - entity_id (bigint, nullable)
  - description (text)
  - ip_address (string, nullable)
  - user_agent (text, nullable)
  - metadata (json, nullable)
  - created_at (timestamp)
  - updated_at (timestamp)
  - indexes: user_id, action_type, entity_type, created_at
```

## Modules with Activity Logging

The following modules now have comprehensive activity logging:

### ✅ Fully Implemented
1. **Authentication** - Login/logout activities
2. **Employee Management** - Create, update, delete employees
3. **Applicant/Recruitment** - Applicant creation, status updates, hiring
4. **Leave Management** - Leave requests, status updates, deletions
5. **Payroll** - Payroll generation and processing
6. **Attendance** - Has LogsActivity trait (ready for logging)
7. **Performance Management** - Has LogsActivity trait (ready for logging)
8. **Training & Development** - Has LogsActivity trait (ready for logging)
9. **Disciplinary Cases** - Has LogsActivity trait (ready for logging)
10. **Positions** - Has LogsActivity trait (ready for logging)
11. **Resignations** - Has LogsActivity trait (ready for logging)
12. **Terminations** - Has LogsActivity trait (ready for logging)
13. **Schedule Management** - Has LogsActivity trait (ready for logging)
14. **Holiday Management** - Has LogsActivity trait (ready for logging)

### How to Add Logging to Remaining Operations

For modules that have the LogsActivity trait but need logging added to specific methods, simply add log calls:

```php
// After create operation
$this->logCreate('entity_type', $entity->id, $entity->name);

// After update operation
$this->logUpdate('entity_type', $entity->id, $entity->name);

// After delete operation
$this->logDelete('entity_type', $entityId, $entityName);

// Custom actions
$this->logCustomActivity('action_type', 'Description', 'entity_type', $entity->id);
```

## Future Enhancements

Potential improvements for the activity log system:
1. Export activity logs to CSV/PDF
2. Advanced search with text filtering
3. Activity log retention policy (auto-delete old logs)
4. Real-time activity notifications
5. Activity analytics and reports
6. Anomaly detection for suspicious activities
7. Bulk log operations
8. Activity log comparison between date ranges
9. Add logging to remaining CRUD operations in all modules
10. Activity log dashboard with visualizations

## Security Considerations

- Activity logs are only accessible to authenticated users
- Users can only view their own activity logs by default
- HR/Admin users can view all activity logs through a separate endpoint
- IP addresses and user agents are captured for security auditing
- All API routes are protected with authentication middleware
