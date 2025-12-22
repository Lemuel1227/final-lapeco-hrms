<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Models\Position;
use App\Models\Notification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Traits\LogsActivity;

class EmployeeController extends Controller
{
    use LogsActivity;
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->role;
        
        // Role-based filtering is now handled by middleware, but we still need to filter data based on role
        if ($role === 'SUPER_ADMIN') {
            // HR can see all employees except terminated/resigned ones
            $employees = User::with('leaveCredits')
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->get();
        } elseif ($user->is_team_leader) {
            // Team leaders can see employees with the same position_id, excluding terminated/resigned
            $employees = User::with('leaveCredits')
                ->where('position_id', $user->position_id)
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->get();
        } else {
            // Regular employees can see all employees in their position, excluding terminated/resigned
            $employees = User::with('leaveCredits')
                ->where('position_id', $user->position_id)
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->get();
        }
        
        return $this->formatEmployeeResponse($employees, $user, $role);
    }

    /**
     * Get limited employee data for list view (optimized for performance)
     */
    public function getEmployeesList(Request $request)
    {
        $user = $request->user();
        $role = $user->role;
        
        // Role-based filtering
        if ($role === 'SUPER_ADMIN') {
            // HR can see all employees except terminated/resigned ones
            $employees = User::whereNotIn('employment_status', ['terminated', 'resigned'])
                        ->select('id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id', 'joining_date', 'attendance_status', 'image_url', 'account_status', 'role', 'is_team_leader')
                        ->get();
        } elseif ($user->is_team_leader) {
            // Team leaders can see employees with the same position_id, excluding terminated/resigned
            $employees = User::where('position_id', $user->position_id)
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->select('id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id', 'joining_date', 'attendance_status', 'image_url', 'account_status', 'role', 'is_team_leader')
                ->get();
        } else {
            // Regular employees can see employees in their position, excluding terminated/resigned
            $employees = User::where('position_id', $user->position_id)
                        ->whereNotIn('employment_status', ['terminated', 'resigned'])
                        ->select('id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id', 'joining_date', 'attendance_status', 'image_url', 'account_status', 'role', 'is_team_leader')
                        ->get();
        }
        
        // Get positions for mapping
        $positions = Position::all()->mapWithKeys(function ($pos) {
            return [$pos->id => $pos->name];
        });
        
        // Format limited response data
        $employees = $employees->map(function ($employee) use ($positions) {
            // Compute full name from name components
            $fullName = trim(implode(' ', array_filter([
                $employee->first_name,
                $employee->middle_name,
                $employee->last_name,
            ])));
            
            return [
                'id' => $employee->id,
                'name' => $fullName,
                'email' => $employee->email,
                'position_id' => $employee->position_id,
                'position' => $positions[$employee->position_id] ?? 'Unassigned',
                'joining_date' => $employee->joining_date,
                'attendance_status' => $employee->attendance_status ?? 'Pending',
                'profile_picture_url' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
                'status' => $employee->account_status, // For frontend compatibility
            ];
        });
        
        return response()->json($employees);
    }

    /**
     * Get all employees including terminated/resigned for resignation management
     */
    public function getAllEmployees(Request $request)
    {
        $user = $request->user();
        $role = $user->role;
        
        // Only HR personnel can access all employees including terminated/resigned
        if ($role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $employees = User::all();
        
        return $this->formatEmployeeResponse($employees, $user, $role);
    }

    /**
     * Format employee response data
     */
    private function formatEmployeeResponse($employees, $user, $role, $returnJson = true)
    {
        
        $positions = Position::all()->mapWithKeys(function ($pos) {
            return [$pos->id => $pos->name];
        });
        
        $employees = $employees->map(function ($employee) use ($positions, $user, $role) {
            // Format leave credits - map to frontend-friendly keys
            $leaveCreditsRaw = [];
            foreach ($employee->leaveCredits as $credit) {
                $leaveCreditsRaw[$credit->leave_type] = [
                    'total' => $credit->total_credits,
                    'used' => $credit->used_credits,
                    'remaining' => max(0, $credit->total_credits - $credit->used_credits),
                ];
            }
            
            // Ensure all leave types are present
            $leaveCredits = [
                'Vacation Leave' => $leaveCreditsRaw['Vacation Leave'] ?? ['total' => 0, 'used' => 0, 'remaining' => 0],
                'Sick Leave' => $leaveCreditsRaw['Sick Leave'] ?? ['total' => 0, 'used' => 0, 'remaining' => 0],
            ];

            $data = [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'role' => $employee->is_team_leader ? 'TEAM_LEADER' : $employee->role,
                'is_team_leader' => $employee->is_team_leader,
                'position_id' => $employee->position_id,
                'position' => $positions[$employee->position_id] ?? 'Unassigned',
                'joining_date' => $employee->joining_date,
                'birthday' => $employee->birthday,
                'gender' => $employee->gender,
                'address' => $employee->address,
                'contact_number' => $employee->contact_number,
                'profile_picture_url' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
                'account_status' => $employee->account_status,
                'attendance_status' => $employee->attendance_status ?? 'Pending',
                'employment_status' => $employee->employment_status,
                'password_changed' => $employee->password_changed,
                'leaveCredits' => $leaveCredits,
            ];
            
            // Only include sensitive data for HR personnel or if it's the user's own data
            if ($role === 'SUPER_ADMIN' || $employee->id === $user->id) {
                $data['sss_no'] = $employee->sss_no;
                $data['tin_no'] = $employee->tin_no;
                $data['pag_ibig_no'] = $employee->pag_ibig_no;
                $data['philhealth_no'] = $employee->philhealth_no;
                $data['resume_file'] = $employee->resume_file;
                // Generate secure URL for private resume files
                $data['resumeUrl'] = $employee->resume_file ? route('employee.resume', $employee->id) : null;
            } else {
                $data['sss_no'] = null;
                $data['tin_no'] = null;
                $data['pag_ibig_no'] = null;
                $data['philhealth_no'] = null;
                $data['resume_file'] = null;
                $data['resumeUrl'] = null;
            }
            
            return $data;
        });
        
        return $returnJson ? response()->json($employees) : $employees;
    }

    public function show(Request $request, User $employee)
    {
        $user = $request->user();
        $role = $user->role;
        
        // Authorization is now handled by middleware
        
        // Load position relationship
        $employee->load('position');
        
        $data = [
            'id' => $employee->id,
            'first_name' => $employee->first_name,
            'middle_name' => $employee->middle_name,
            'last_name' => $employee->last_name,
            'name' => trim(implode(' ', array_filter([
                $employee->first_name,
                $employee->middle_name,
                $employee->last_name,
            ]))),
            'email' => $employee->email,
            'role' => $employee->role,
            'employee_id' => $employee->employee_id,
            'position_id' => $employee->position_id,
            'position' => $employee->position ? $employee->position->name : null,
            'joining_date' => $employee->joining_date,
            'birthday' => $employee->birthday,
            'gender' => $employee->gender,
            'address' => $employee->address,
            'contact_number' => $employee->contact_number,
            'profile_picture_url' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
            'account_status' => $employee->account_status,
            'attendance_status' => $employee->attendance_status ?? 'Pending',
            'sss_no' => $employee->sss_no,
            'tin_no' => $employee->tin_no,
            'pag_ibig_no' => $employee->pag_ibig_no,
            'philhealth_no' => $employee->philhealth_no,
            'resume_file' => $employee->resume_file,
            'resumeUrl' => $employee->resume_file ? route('employee.resume', $employee->id) : null,
        ];
        
        return response()->json($data);
    }

    public function store(Request $request)
    {
        // Authorization is now handled by middleware
        
        // Debug logging for file upload BEFORE validation
        Log::info('Request debug info:', [
            'has_file' => $request->hasFile('resume_file'),
            'all_files' => $request->allFiles(),
            'content_type' => $request->header('Content-Type'),
            'request_method' => $request->method()
        ]);
        
        if ($request->hasFile('resume_file')) {
            $file = $request->file('resume_file');
            Log::info('File upload debug BEFORE validation:', [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'extension' => $file->getClientOriginalExtension(),
                'is_valid' => $file->isValid(),
                'temp_path' => $file->getPathname()
            ]);
        } else {
            Log::info('No file uploaded in request BEFORE validation');
        }
        
        if ($request->filled('name')) {
            [$first, $middle, $last] = User::splitFullName($request->input('name'));

            $nameComponents = [];
            if (!$request->filled('first_name')) {
                $nameComponents['first_name'] = $first;
            }
            if (!$request->has('middle_name')) {
                $nameComponents['middle_name'] = $middle;
            }
            if (!$request->filled('last_name')) {
                $nameComponents['last_name'] = $last;
            }

            if (!empty($nameComponents)) {
                $request->merge($nameComponents);
            }
        }

        try {
            $validated = $request->validate([
                'first_name' => 'required|string|min:2|max:50|regex:/^[a-zA-Z\s.\-]+$/',
                'middle_name' => 'nullable|string|max:50|regex:/^[a-zA-Z\s.\-]+$/',
                'last_name' => 'required|string|min:2|max:50|regex:/^[a-zA-Z\s.\-]+$/',
                'name' => 'sometimes|string|max:255',
                'email' => 'required|email|max:255|unique:users,email',
                'role' => 'required|string|in:SUPER_ADMIN,REGULAR_EMPLOYEE,TEAM_LEADER',
                'position_id' => 'nullable|exists:positions,id',
                'joining_date' => 'required|date',
                'birthday' => 'required|date|before:today|after:' . now()->subYears(100)->format('Y-m-d'),
                'gender' => 'required|string|in:Male,Female',
                'address' => 'required|string|min:10|max:500',
                'contact_number' => 'required|string|regex:/^[0-9+\-()\s]+$/|min:7|max:20',
                'imageUrl' => 'nullable|file|mimes:jpeg,jpg,png,gif|max:2048', 
                'sss_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:12',
                'tin_no' => 'nullable|string|regex:/^[0-9\-]+$/|min:11|max:15',
                'pag_ibig_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:14',
                'philhealth_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:14',
                'resume_file' => 'nullable|file|mimes:pdf,doc,docx|max:5120', 
                'account_status' => 'nullable|string|in:Active,Deactivated',
            ], [
                'first_name.min' => 'First name must be at least 2 characters.',
                'first_name.max' => 'First name must not exceed 50 characters.',
                'first_name.regex' => 'First name can only contain letters, spaces, dots and hyphens.',
                'middle_name.regex' => 'Middle name can only contain letters, spaces, dots and hyphens.',
                'last_name.min' => 'Last name must be at least 2 characters.',
                'last_name.max' => 'Last name must not exceed 50 characters.',
                'last_name.regex' => 'Last name can only contain letters, spaces, dots and hyphens.',
                'email.max' => 'Email must not exceed 255 characters.',
                'birthday.before' => 'Birthday must be in the past.',
                'birthday.after' => 'Employee must be at least 18 years old.',
                'gender.in' => 'Gender must be either Male or Female.',
                'address.min' => 'Address must be at least 10 characters.',
                'address.max' => 'Address must not exceed 500 characters.',
                'contact_number.regex' => 'Contact number can only contain digits, +, -, (), and spaces.',
                'contact_number.min' => 'Contact number must be at least 7 characters.',
                'sss_no.regex' => 'SSS number must contain only digits and hyphens.',
                'sss_no.size' => 'SSS number must be in format 12-3456789-0.',
                'tin_no.regex' => 'TIN must contain only digits and hyphens.',
                'pag_ibig_no.regex' => 'Pag-IBIG number must contain only digits and hyphens.',
                'pag_ibig_no.size' => 'Pag-IBIG number must be in format 1234-5678-9012.',
                'philhealth_no.regex' => 'PhilHealth number must contain only digits and hyphens.',
                'philhealth_no.size' => 'PhilHealth number must be in format 12-345678901-2.',
            ]);

            // Debug logging for file upload AFTER validation
            if ($request->hasFile('resume_file')) {
                $file = $request->file('resume_file');
                Log::info('File upload debug AFTER validation:', [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'extension' => $file->getClientOriginalExtension(),
                    'is_valid' => $file->isValid(),
                    'temp_path' => $file->getPathname()
                ]);
            } else {
                Log::info('No file uploaded in request AFTER validation');
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->errors();
            
            // Check for specific email duplicate error
            if (isset($errors['email']) && in_array('The email has already been taken.', $errors['email'])) {
                return response()->json([
                    'message' => 'This email address is already registered in the system. Please use a different email address.',
                    'error_type' => 'duplicate_email_error',
                    'errors' => $errors
                ], 422);
            }
            
            // Generate more specific error message based on validation errors
            $specificMessages = [];
            foreach ($errors as $field => $fieldErrors) {
                switch ($field) {
                    case 'first_name':
                        $specificMessages[] = 'First name is required and must be valid';
                        break;
                    case 'middle_name':
                        break;
                    case 'role':
                        $specificMessages[] = 'Please select a valid employee role';
                        break;
                    case 'position_id':
                        $specificMessages[] = 'Please select a valid position';
                        break;
                    case 'joining_date':
                        $specificMessages[] = 'Joining date is required';
                        break;
                    case 'birthday':
                        $specificMessages[] = 'Birth date is required';
                        break;
                    case 'gender':
                        $specificMessages[] = 'Gender is required';
                        break;
                    case 'address':
                        $specificMessages[] = 'Address is required';
                        break;
                    case 'contact_number':
                        $specificMessages[] = 'Contact number is required and must be 20 characters or less';
                        break;
                    case 'resume_file':
                        $specificMessages[] = 'Resume file must be a PDF, DOC, or DOCX file and less than 5MB';
                        break;
                    default:
                        $specificMessages[] = ucfirst(str_replace('_', ' ', $field)) . ' has invalid data';
                        break;
                }
            }
            
            $message = count($specificMessages) === 1 
                ? $specificMessages[0] 
                : 'Please fix the following issues: ' . implode(', ', $specificMessages);
            
            return response()->json([
                'message' => $message,
                'error_type' => 'validation_error',
                'errors' => $errors
            ], 422);
        }

        try {
            // Remove resume_file from validated data to handle it separately
            $resumeFile = null;
            if (isset($validated['resume_file'])) {
                unset($validated['resume_file']);
            }
            
            // Handle file upload - store in private storage (storage/app/resumes)
            if ($request->hasFile('resume_file') && $request->file('resume_file')->isValid()) {
                $file = $request->file('resume_file');
                $filename = time() . '_' . $file->getClientOriginalName();
                
                try {
                    // Ensure the resumes directory exists
                    $resumesPath = Storage::disk('local')->path('resumes');
                    if (!file_exists($resumesPath)) {
                        mkdir($resumesPath, 0755, true);
                        Log::info('Created resumes directory:', ['path' => $resumesPath]);
                    }
                    
                    // Use the Laravel 12 recommended approach: storeAs method on uploaded file
                    $storedPath = $file->storeAs('resumes', $filename, 'local');
                    
                    if ($storedPath) {
                        $resumeFile = $storedPath; // e.g., 'resumes/123_name.pdf'
                        $fullPath = Storage::disk('local')->path($storedPath);
                        
                        Log::info('File stored successfully using storeAs():', [
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $storedPath,
                            'full_path' => $fullPath,
                            'file_exists' => file_exists($fullPath),
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType()
                        ]);
                    } else {
                        Log::error('Failed to store file using storeAs() - returned false');
                    }
                } catch (\Exception $e) {
                    Log::error('Exception during file storage:', [
                        'error' => $e->getMessage(),
                        'file_name' => $file->getClientOriginalName(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                if ($request->hasFile('resume_file')) {
                    Log::error('Resume file is invalid');
                } else {
                    Log::info('No resume file in request');
                }
            }
            
            // Handle profile picture upload - store in public storage (storage/app/public/profile_pictures)
            $profilePicturePath = null;
            if ($request->hasFile('imageUrl') && $request->file('imageUrl')->isValid()) {
                $file = $request->file('imageUrl');
                $filename = time() . '_profile_' . Str::uuid() . '.' . $file->getClientOriginalExtension();
                
                try {
                    // Store in public disk so it's accessible via URL
                    $storedPath = $file->storeAs('profile_pictures', $filename, 'public');
                    
                    if ($storedPath) {
                        $profilePicturePath = $storedPath; // e.g., 'profile_pictures/123_profile_uuid.jpg'
                        Log::info('Profile picture stored successfully:', [
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $storedPath,
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType()
                        ]);
                    } else {
                        Log::error('Failed to store profile picture - returned false');
                    }
                } catch (\Exception $e) {
                    Log::error('Exception during profile picture storage:', [
                        'error' => $e->getMessage(),
                        'file_name' => $file->getClientOriginalName(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                if ($request->hasFile('imageUrl')) {
                    Log::error('Profile picture file is invalid');
                } else {
                    Log::info('No profile picture in request');
                }
            }
            
            // Compose data for user creation
            $userData = $validated;

            if (isset($userData['name'])) {
                [$first, $middle, $last] = User::splitFullName($userData['name']);
                $userData['first_name'] = $userData['first_name'] ?? $first;
                if (!array_key_exists('middle_name', $userData) || $userData['middle_name'] === null) {
                    $userData['middle_name'] = $middle;
                }
                $userData['last_name'] = $userData['last_name'] ?? $last;
                unset($userData['name']);
            }

            // Add default values for required fields
            $userData['password'] = Hash::make('temporary'); // Temporary password, will be updated after creation
            $userData['password_changed'] = false;
            $userData['account_status'] = $userData['account_status'] ?? 'Active';

            // Handle Team Leader role
            if ($userData['role'] === 'TEAM_LEADER') {
                $userData['is_team_leader'] = true;
                $userData['role'] = 'REGULAR_EMPLOYEE';
                
                // Enforce max team leaders per position
                if (!empty($userData['position_id'])) {
                    $position = \App\Models\Position::find($userData['position_id']);
                    $maxLeaders = $position->max_team_leaders ?? 1;
                    
                    if ($maxLeaders == 1) {
                         User::where('position_id', $userData['position_id'])
                            ->where('is_team_leader', true)
                            ->update(['is_team_leader' => false]);
                    } else {
                        $currentCount = User::where('position_id', $userData['position_id'])
                            ->where('is_team_leader', true)
                            ->count();
                        if ($currentCount >= $maxLeaders) {
                             return response()->json(['message' => "Maximum number of team leaders ($maxLeaders) reached for this position."], 422);
                        }
                    }
                }
            } else {
                $userData['is_team_leader'] = false;
            }

            // Add resume file path if it was uploaded
            if ($resumeFile) {
                $userData['resume_file'] = $resumeFile;
            }

            // Add profile picture path if it was uploaded
            if ($profilePicturePath) {
                $userData['image_url'] = $profilePicturePath;
            }

            $userData['name'] = trim(implode(' ', array_filter([
                $userData['first_name'] ?? null,
                $userData['middle_name'] ?? null,
                $userData['last_name'] ?? null,
            ])));

            // Create employee first to get the ID
            $employee = new User();
            $employee->fillNameComponents($userData);
            $employee->fill(array_diff_key($userData, array_flip(['first_name', 'middle_name', 'last_name', 'name'])));
            $employee->save();
            
            // Generate password as 'lapeco+id' and update it
            $defaultPassword = 'lapeco' . $employee->id;
            $employee->update([
                'password' => Hash::make($defaultPassword)
            ]);
            
            // Format the response using the same method as other endpoints
            $user = $request->user();
            $formattedEmployee = $this->formatEmployeeResponse(collect([$employee->fresh()]), $user, $user->role, false)->first();

            // Log activity
            $this->logCreate('employee', $employee->id, $employee->name);
            
            // Return employee with account details for the modal
            return response()->json([
                'message' => 'Employee created successfully! Login credentials have been generated.',
                'employee' => $formattedEmployee,
                'account_details' => [
                    'employee_id' => $employee->id,
                    'username' => $employee->email,
                    'password' => $defaultPassword,
                    'email' => $employee->email
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create employee. Please try again or contact system administrator.',
                'error_type' => 'database_error',
                'details' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function update(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Authorization is now handled by middleware, but we still need user context for data filtering
        
        try {
            if ($request->filled('name')) {
                [$first, $middle, $last] = User::splitFullName($request->input('name'));

                $nameComponents = [];
                if (!$request->has('first_name')) {
                    $nameComponents['first_name'] = $first;
                }
                if (!$request->has('middle_name')) {
                    $nameComponents['middle_name'] = $middle;
                }
                if (!$request->has('last_name')) {
                    $nameComponents['last_name'] = $last;
                }

                if (!empty($nameComponents)) {
                    $request->merge($nameComponents);
                }
            }

            $validated = $request->validate([
                'first_name' => 'sometimes|string|min:2|max:50|regex:/^[a-zA-Z\s.\-]+$/',
                'middle_name' => 'sometimes|nullable|string|max:50|regex:/^[a-zA-Z\s.\-]+$/',
                'last_name' => 'sometimes|string|min:2|max:50|regex:/^[a-zA-Z\s.\-]+$/',
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|max:255|unique:users,email,' . $employee->id,
                'role' => 'sometimes|string|in:SUPER_ADMIN,TEAM_LEADER,REGULAR_EMPLOYEE',
                'position_id' => 'sometimes|nullable|exists:positions,id',
                'birthday' => 'sometimes|required|date|before:today|after:' . now()->subYears(100)->format('Y-m-d'),
                'gender' => 'sometimes|required|string|in:Male,Female',
                'address' => 'sometimes|required|string|min:10|max:500',
                'contact_number' => 'sometimes|required|string|regex:/^[0-9+\-()\s]+$/|min:7|max:20',
                'imageUrl' => 'sometimes|nullable|file|mimes:jpeg,jpg,png,gif|max:2048', 
                'sss_no' => 'sometimes|nullable|string|regex:/^[0-9\-]+$/|size:12',
                'tin_no' => 'sometimes|nullable|string|regex:/^[0-9\-]+$/|min:11|max:15',
                'pag_ibig_no' => 'sometimes|nullable|string|regex:/^[0-9\-]+$/|size:14',
                'philhealth_no' => 'sometimes|nullable|string|regex:/^[0-9\-]+$/|size:14',
                'resume_file' => 'sometimes|nullable|file|mimes:pdf,doc,docx|max:5120', 
                'account_status' => 'sometimes|nullable|string|in:Active,Deactivated',
            ], [
                'first_name.min' => 'First name must be at least 2 characters.',
                'first_name.max' => 'First name must not exceed 50 characters.',
                'first_name.regex' => 'First name can only contain letters, spaces, dots and hyphens.',
                'middle_name.regex' => 'Middle name can only contain letters, spaces, dots and hyphens.',
                'last_name.min' => 'Last name must be at least 2 characters.',
                'last_name.max' => 'Last name must not exceed 50 characters.',
                'last_name.regex' => 'Last name can only contain letters, spaces, dots and hyphens.',
                'email.max' => 'Email must not exceed 255 characters.',
                'birthday.before' => 'Birthday must be in the past.',
                'birthday.after' => 'Employee must be at least 18 years old.',
                'gender.in' => 'Gender must be either Male or Female.',
                'address.min' => 'Address must be at least 10 characters.',
                'address.max' => 'Address must not exceed 500 characters.',
                'contact_number.regex' => 'Contact number can only contain digits, +, -, (), and spaces.',
                'contact_number.min' => 'Contact number must be at least 7 characters.',
                'sss_no.regex' => 'SSS number must contain only digits and hyphens.',
                'sss_no.size' => 'SSS number must be in format 12-3456789-0.',
                'tin_no.regex' => 'TIN must contain only digits and hyphens.',
                'pag_ibig_no.regex' => 'Pag-IBIG number must contain only digits and hyphens.',
                'pag_ibig_no.size' => 'Pag-IBIG number must be in format 1234-5678-9012.',
                'philhealth_no.regex' => 'PhilHealth number must contain only digits and hyphens.',
                'philhealth_no.size' => 'PhilHealth number must be in format 12-345678901-2.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->errors();
            
            // Check for specific email duplicate error
            if (isset($errors['email']) && in_array('The email has already been taken.', $errors['email'])) {
                return response()->json([
                    'message' => 'This email address is already registered in the system. Please use a different email address.',
                    'error_type' => 'duplicate_email_error',
                    'errors' => $errors
                ], 422);
            }
            
            // Generate more specific error message based on validation errors
            $specificMessages = [];
            foreach ($errors as $field => $fieldErrors) {
                switch ($field) {
                    case 'name':
                        $specificMessages[] = 'Employee name is required and must be valid';
                        break;
                    case 'email':
                        $specificMessages[] = 'A valid email address is required';
                        break;
                    case 'role':
                        $specificMessages[] = 'Please select a valid employee role';
                        break;
                    case 'position_id':
                        $specificMessages[] = 'Please select a valid position';
                        break;
                    case 'birthday':
                        $specificMessages[] = 'Birth date is required';
                        break;
                    case 'gender':
                        $specificMessages[] = 'Gender is required';
                        break;
                    case 'address':
                        $specificMessages[] = 'Address is required';
                        break;
                    case 'contact_number':
                        $specificMessages[] = 'Contact number is required and must be 20 characters or less';
                        break;
                    case 'resume_file':
                        $specificMessages[] = 'Resume file must be a PDF, DOC, or DOCX file and less than 5MB';
                        break;
                    default:
                        $specificMessages[] = ucfirst(str_replace('_', ' ', $field)) . ' has invalid data';
                        break;
                }
            }
            
            $message = count($specificMessages) === 1 
                ? $specificMessages[0] 
                : 'Please fix the following issues: ' . implode(', ', $specificMessages);
            
            return response()->json([
                'message' => $message,
                'error_type' => 'validation_error',
                'errors' => $errors
            ], 422);
        }

        try {
            // Remove resume_file from validated data to handle it separately
            $resumeFile = null;
            if (isset($validated['resume_file'])) {
                unset($validated['resume_file']);
            }
            
            // Handle file upload - store in private storage (storage/app/resumes)
            if ($request->hasFile('resume_file') && $request->file('resume_file')->isValid()) {
                $file = $request->file('resume_file');
                $filename = time() . '_' . $file->getClientOriginalName();
                
                try {
                    // Ensure the resumes directory exists
                    $resumesPath = Storage::disk('local')->path('resumes');
                    if (!file_exists($resumesPath)) {
                        mkdir($resumesPath, 0755, true);
                        Log::info('Created resumes directory in update:', ['path' => $resumesPath]);
                    }
                    
                    // Use the Laravel 12 recommended approach: storeAs method on uploaded file
                    $storedPath = $file->storeAs('resumes', $filename, 'local');
                    
                    if ($storedPath) {
                        $resumeFile = $storedPath;
                        $fullPath = Storage::disk('local')->path($storedPath);
                        
                        Log::info('File stored successfully in update using storeAs():', [
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $storedPath,
                            'full_path' => $fullPath,
                            'file_exists' => file_exists($fullPath),
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType()
                        ]);
                    } else {
                        Log::error('Failed to store file in update using storeAs() - returned false');
                    }
                } catch (\Exception $e) {
                    Log::error('Exception during file storage in update:', [
                        'error' => $e->getMessage(),
                        'file_name' => $file->getClientOriginalName(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                if ($request->hasFile('resume_file')) {
                    Log::error('Resume file is invalid in update');
                } else {
                    Log::info('No resume file in update request');
                }
            }
            
            // Handle profile picture upload - store in public storage (storage/app/public/profile_pictures)  
            $profilePicturePath = null;
            if ($request->hasFile('imageUrl') && $request->file('imageUrl')->isValid()) {
                $file = $request->file('imageUrl');
                $filename = time() . '_profile_' . Str::uuid() . '.' . $file->getClientOriginalExtension();
                
                try {
                    // Store in public disk so it's accessible via URL
                    $storedPath = $file->storeAs('profile_pictures', $filename, 'public');
                    
                    if ($storedPath) {
                        $profilePicturePath = $storedPath; // e.g., 'profile_pictures/123_profile_uuid.jpg'
                        Log::info('Profile picture updated successfully:', [
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $storedPath,
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType()
                        ]);
                    } else {
                        Log::error('Failed to update profile picture - returned false');
                    }
                } catch (\Exception $e) {
                    Log::error('Exception during profile picture update:', [
                        'error' => $e->getMessage(),
                        'file_name' => $file->getClientOriginalName(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                if ($request->hasFile('imageUrl')) {
                    Log::error('Profile picture file is invalid in update');
                } else {
                    Log::info('No profile picture in update request');
                }
            }
            
            // Add resume file path if it was uploaded
            if ($resumeFile) {
                $validated['resume_file'] = $resumeFile;
            }
            
            // Add profile picture path if it was uploaded
            if ($profilePicturePath) {
                $validated['image_url'] = $profilePicturePath;
            }
            
            // Store original values for comparison
            $originalRole = $employee->role;
            $originalIsTeamLeader = $employee->is_team_leader;
            $originalPositionId = $employee->position_id;
            
            $nameData = [];
            if (array_key_exists('first_name', $validated)) {
                $nameData['first_name'] = $validated['first_name'];
                unset($validated['first_name']);
            }
            if (array_key_exists('middle_name', $validated)) {
                $nameData['middle_name'] = $validated['middle_name'];
                unset($validated['middle_name']);
            }
            if (array_key_exists('last_name', $validated)) {
                $nameData['last_name'] = $validated['last_name'];
                unset($validated['last_name']);
            }

            if (isset($validated['name'])) {
                [$first, $middle, $last] = User::splitFullName($validated['name']);
                $nameData = $nameData + array_filter([
                    'first_name' => $first,
                    'middle_name' => $middle,
                    'last_name' => $last,
                ], fn ($value) => $value !== null);
                unset($validated['name']);
            }

            if (!empty($nameData)) {
                $employee->fillNameComponents($nameData);
            }

            // Handle Team Leader role update
            if (isset($validated['role'])) {
                if ($validated['role'] === 'TEAM_LEADER') {
                    $validated['is_team_leader'] = true;
                    $validated['role'] = 'REGULAR_EMPLOYEE';
                } elseif ($validated['role'] === 'REGULAR_EMPLOYEE') {
                    $validated['is_team_leader'] = false;
                } elseif ($validated['role'] === 'SUPER_ADMIN') {
                    $validated['is_team_leader'] = false;
                }
            }

            // Enforce max team leaders per position if becoming a team leader or changing position as a team leader
            $willBeTeamLeader = isset($validated['is_team_leader']) ? $validated['is_team_leader'] : $employee->is_team_leader;
            $newPositionId = isset($validated['position_id']) ? $validated['position_id'] : $employee->position_id;
            
            if ($willBeTeamLeader && $newPositionId) {
                 $position = \App\Models\Position::find($newPositionId);
                 $maxLeaders = $position->max_team_leaders ?? 1;
                 
                 if ($maxLeaders == 1) {
                     User::where('position_id', $newPositionId)
                        ->where('is_team_leader', true)
                        ->where('id', '!=', $employee->id)
                        ->update(['is_team_leader' => false]);
                 } else {
                     $currentCount = User::where('position_id', $newPositionId)
                        ->where('is_team_leader', true)
                        ->where('id', '!=', $employee->id)
                        ->count();
                     if ($currentCount >= $maxLeaders) {
                         return response()->json(['message' => "Maximum number of team leaders ($maxLeaders) reached for this position."], 422);
                     }
                 }
            }

            $employee->update($validated);
            
            // Check if role or position changed and create notifications
            $updatedEmployee = $employee->fresh();
            
            // Create notification for role/status change
            $roleChanged = (isset($validated['role']) && $originalRole !== $validated['role']);
            $leaderStatusChanged = ($originalIsTeamLeader !== $employee->is_team_leader);

            if ($roleChanged || $leaderStatusChanged) {
                $roleChangeMessage = '';
                
                if ($leaderStatusChanged) {
                    if ($employee->is_team_leader) {
                        $roleChangeMessage = "You have been promoted to Team Leader.";
                    } else {
                        $roleChangeMessage = "Your role has been changed from Team Leader to Regular Employee.";
                    }
                } elseif ($roleChanged) {
                    $roleChangeMessage = "Your role has been updated to {$validated['role']}.";
                }
                
                if ($roleChangeMessage) {
                    Notification::createForUser(
                        $employee->id,
                        'role_change',
                        'Role Updated',
                        $roleChangeMessage
                    );
                }
            }
            
            // Create notification for position change
            if (isset($validated['position_id']) && $originalPositionId !== $validated['position_id']) {
                $newPosition = $validated['position_id'] ? Position::find($validated['position_id']) : null;
                $oldPosition = $originalPositionId ? Position::find($originalPositionId) : null;
                
                $positionChangeMessage = $newPosition 
                    ? "Your position has been changed to {$newPosition->name}."
                    : "You have been removed from your position.";
                
                if ($oldPosition && $newPosition) {
                    $positionChangeMessage = "Your position has been changed from {$oldPosition->name} to {$newPosition->name}.";
                }
                
                Notification::createForUser(
                    $employee->id,
                    'position_change',
                    'Position Updated',
                    $positionChangeMessage
                );
            }
            
            // Format the response using the same method as other endpoints
            $user = $request->user();
            $formattedEmployee = $this->formatEmployeeResponse(collect([$updatedEmployee]), $user, $user->role, false)->first();
            
            // Log activity
            $this->logUpdate('employee', $employee->id, $employee->name);
            
            return response()->json([
                'message' => 'Employee information updated successfully.',
                'employee' => $formattedEmployee
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update employee information. Please try again or contact system administrator.',
                'error_type' => 'database_error',
                'details' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }


    /**
     * Return HTML error response for iframe display
     */
    private function resumeErrorResponse($title, $message)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <title>Resume Error</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0; 
                    background-color: #f8f9fa;
                    color: #6c757d;
                }
                .error-container { 
                    text-align: center; 
                    padding: 2rem;
                    max-width: 400px;
                }
                .error-icon { 
                    font-size: 4rem; 
                    margin-bottom: 1rem;
                    color: #ffc107;
                }
                .error-title { 
                    font-size: 1.5rem; 
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #495057;
                }
                .error-message { 
                    font-size: 1rem;
                    line-height: 1.5;
                    margin-bottom: 0;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h2 class="error-title">' . htmlspecialchars($title) . '</h2>
                <p class="error-message">' . htmlspecialchars($message) . '</p>
            </div>
        </body>
        </html>';
        
        return response($html, 404, ['Content-Type' => 'text/html']);
    }

    /**
     * Serve private resume files securely using Laravel 12 Storage methods
     */
    public function serveResume(Request $request, User $employee)
    {
        Log::info('Resume access attempt:', [
            'employee_id' => $employee->id,
            'has_token_param' => $request->has('token'),
            'token_param' => $request->get('token') ? substr($request->get('token'), 0, 10) . '...' : null,
            'query_params' => $request->query(),
            'headers' => $request->headers->all()
        ]);
        
        // Try to get user from normal auth, or from token query parameter
        $user = $request->user();
        
        // If no user from normal auth, try token from query parameter
        if (!$user && $request->has('token')) {
            try {
                $token = $request->get('token');
                Log::info('Attempting token authentication:', [
                    'token_length' => strlen($token),
                    'token_start' => substr($token, 0, 10)
                ]);
                
                $personalAccessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                if ($personalAccessToken) {
                    Log::info('Token found:', [
                        'token_id' => $personalAccessToken->id,
                        'tokenable_type' => $personalAccessToken->tokenable_type,
                        'tokenable_id' => $personalAccessToken->tokenable_id
                    ]);
                    
                    if ($personalAccessToken->tokenable) {
                        $user = $personalAccessToken->tokenable;
                        Log::info('User authenticated via token for resume access:', [
                            'user_id' => $user->id,
                            'employee_id' => $employee->id
                        ]);
                    } else {
                        Log::error('Token found but no tokenable user');
                    }
                } else {
                    Log::error('Token not found in database');
                }
            } catch (\Exception $e) {
                Log::error('Error authenticating via token:', ['error' => $e->getMessage()]);
            }
        } else {
            Log::info('Auth status:', [
                'has_user_from_auth' => !!$user,
                'has_token_param' => $request->has('token')
            ]);
        }
        
        // If still no user, unauthorized
        if (!$user) {
            Log::error('No user found after all auth attempts');
            return response()->json(['error' => 'Unauthorized - No valid authentication'], 401);
        }
        
        // Only HR personnel or the employee themselves can access the resume
        if ($user->role !== 'SUPER_ADMIN' && $user->id !== $employee->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        // Check if employee has a resume file
        Log::info('Resume file check:', [
            'employee_id' => $employee->id,
            'resume_file_field' => $employee->resume_file,
            'resume_file_exists_in_db' => !empty($employee->resume_file)
        ]);
        
        if (!$employee->resume_file) {
            return $this->resumeErrorResponse('Resume not found', 'No resume file has been uploaded for this employee.');
        }
        
        // Use Storage::exists() to check if file exists
        $fileExists = Storage::disk('local')->exists($employee->resume_file);
        $fullPath = Storage::disk('local')->path($employee->resume_file);
        
        Log::info('File system check:', [
            'resume_file_path' => $employee->resume_file,
            'full_path' => $fullPath,
            'file_exists_in_storage' => $fileExists,
            'storage_disk_path' => Storage::disk('local')->path(''),
            'directory_contents' => is_dir(dirname($fullPath)) ? scandir(dirname($fullPath)) : 'directory does not exist'
        ]);
        
        if (!$fileExists) {
            return $this->resumeErrorResponse('Resume file not found', 'The resume file exists in the database but could not be found in storage.');
        }
        
        // Use Storage::get() to retrieve file content
        $fileContent = Storage::disk('local')->get($employee->resume_file);
        $fileName = basename($employee->resume_file);
        $mimeType = mime_content_type($fullPath);
        
        // Return file response with proper headers
        return response($fileContent, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $fileName . '"',
            'Content-Length' => strlen($fileContent)
        ]);
    }

    public function rehireEmployee(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can rehire employees
        if ($user->role !== 'SUPER_ADMIN') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        // Check if employee is resigned or terminated
        if (!in_array($employee->employment_status, ['resigned', 'terminated'])) {
            return response()->json(['error' => 'Employee is not resigned or terminated'], 400);
        }
        
        // Reactivate the employee
        $employee->update([
            'employment_status' => 'active',
            'account_status' => 'Active'
        ]);
        
        return response()->json([
            'message' => 'Employee rehired successfully',
            'employee' => $employee->fresh()
        ]);
    }

    public function toggleTeamLeaderStatus(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can toggle team leader status
        if ($user->role !== 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Access denied. Only HR managers can change team leader status.',
                'error_type' => 'authorization_error'
            ], 403);
        }

        try {
            // Toggle is_team_leader flag
            $newStatus = !$employee->is_team_leader;

            // Enforce max team leaders per position if becoming a team leader
            if ($newStatus && $employee->position_id) {
                 $position = \App\Models\Position::find($employee->position_id);
                 $maxLeaders = $position->max_team_leaders ?? 1;
                 
                 if ($maxLeaders == 1) {
                     User::where('position_id', $employee->position_id)
                        ->where('is_team_leader', true)
                        ->where('id', '!=', $employee->id)
                        ->update(['is_team_leader' => false]);
                 } else {
                     $currentCount = User::where('position_id', $employee->position_id)
                        ->where('is_team_leader', true)
                        ->where('id', '!=', $employee->id)
                        ->count();
                     if ($currentCount >= $maxLeaders) {
                         return response()->json(['message' => "Maximum number of team leaders ($maxLeaders) reached for this position."], 422);
                     }
                 }
            }
            
            $employee->update([
                'is_team_leader' => $newStatus,
                // Ensure role is REGULAR_EMPLOYEE if becoming team leader (unless they are SUPER_ADMIN, but usually they are not)
                'role' => ($employee->role === 'SUPER_ADMIN') ? 'SUPER_ADMIN' : 'REGULAR_EMPLOYEE'
            ]);
            
            $statusMessage = $newStatus 
                ? "Employee '{$employee->name}' has been promoted to Team Leader."
                : "Employee '{$employee->name}' has been changed to Regular Employee.";
            
            // Create notification for the employee about their role change
            $notificationMessage = $newStatus 
                ? "You have been promoted to Team Leader."
                : "Your role has been changed from Team Leader to Regular Employee.";
            
            Notification::createForUser(
                $employee->id,
                'role_change',
                'Role Updated',
                $notificationMessage
            );
            
            return response()->json([
                'message' => $statusMessage,
                'employee' => $employee->fresh(),
                'new_role' => $newStatus ? 'TEAM_LEADER' : 'REGULAR_EMPLOYEE',
                'is_team_leader' => $newStatus
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update team leader status. Please try again or contact system administrator.',
                'error_type' => 'database_error',
                'details' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function destroy(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can delete employees
        if ($user->role !== 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Access denied. Only HR managers can delete employee records.',
                'error_type' => 'authorization_error'
            ], 403);
        }

        // Prevent HR from deleting their own account
        if ($user->id === $employee->id) {
            return response()->json([
                'message' => 'You cannot delete your own account. Please contact another HR Manager for assistance.',
                'error_type' => 'self_deletion_error'
            ], 400);
        }

        try {
            $employeeName = $employee->name;
            $employeeId = $employee->id;
            $employee->delete();
            
            // Log activity
            $this->logDelete('employee', $employeeId, $employeeName);
            
            return response()->json([
                'message' => "Employee '{$employeeName}' has been successfully deleted from the system."
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete employee. The employee may have associated records that prevent deletion.',
                'error_type' => 'database_error',
                'details' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
