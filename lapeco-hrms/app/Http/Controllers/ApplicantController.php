<?php

namespace App\Http\Controllers;

use App\Models\Applicant;
use App\Models\User;
use App\Models\Position;
use App\Models\Notification;
use App\Mail\ApplicantApplicationReceived;
use App\Mail\ApplicantStatusUpdated;
use App\Mail\ApplicantHired;
use App\Mail\ApplicantInterviewScheduled;
use App\Mail\ApplicantRejected;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Traits\LogsActivity;

class ApplicantController extends Controller
{
    use LogsActivity;


    /**
     * Display a listing of applicants.
     */
    public function index(Request $request)
    {
        $query = Applicant::query();

        // Filter by status
        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('application_date', [$request->start_date, $request->end_date]);
        }

        // Search by name or email
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Check if summary view is requested (for recruitment page list)
        $isSummary = $request->has('summary') && $request->summary === 'true';

        if ($isSummary) {
            $query->where(function ($q) {
                $q->where('status', '!=', 'Hired')
                  ->orWhere('updated_at', '>=', now()->subDays(3));
            });
            $applicants = $query->select([
                'id',
                'first_name', 
                'middle_name', 
                'last_name',
                'phone',
                'address',
                'gender',
                'birthday',
                'status',
                'application_date',
                'updated_at',
                'interview_schedule',
                'job_opening_id'
            ])->orderBy('application_date', 'desc')->get();

            // Add only essential computed attributes for list view
            $applicants->each(function ($applicant) {
                $applicant->append(['full_name']);
            });
        } else {
            // Return full data (for details view or other uses)
            $applicants = $query->orderBy('application_date', 'desc')->get();

            // Append all attributes including file URLs
            $applicants->each(function ($applicant) {
                $applicant->append(['full_name', 'resume_url', 'profile_picture_url']);
            });
        }

        return response()->json($applicants);
    }

    /**
     * Store a newly created applicant.
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|unique:applicants,email',
                'job_opening_id' => 'required|integer|exists:positions,id',
                'middle_name' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:20',
                'address' => 'nullable|string|max:255',
                'birthday' => 'nullable|date|before_or_equal:' . now()->subYears(18)->toDateString(),
                'gender' => 'nullable|in:Male,Female',
                'sss_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:12',
                'tin_no' => 'nullable|string|regex:/^[0-9\-]+$/|min:11|max:15',
                'pag_ibig_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:14',
                'philhealth_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:14',
                'resume' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // 5MB max
                'profile_picture' => 'nullable|file|mimes:jpeg,jpg,png,gif|max:2048', // 2MB max
                'sss_document' => 'required_with:sss_no|file|mimes:pdf,jpeg,jpg,png,gif|max:5120',
                'tin_document' => 'required_with:tin_no|file|mimes:pdf,jpeg,jpg,png,gif|max:5120',
                'pagibig_document' => 'required_with:pag_ibig_no|file|mimes:pdf,jpeg,jpg,png,gif|max:5120',
                'philhealth_document' => 'required_with:philhealth_no|file|mimes:pdf,jpeg,jpg,png,gif|max:5120',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->except(['resume', 'profile_picture']);
            $data['application_date'] = now()->toDateString();

            $applicant = Applicant::create($data);

            if ($request->hasFile('resume') && $request->file('resume')->isValid()) {
                $file = $request->file('resume');
                $filename = time() . '_resume_' . preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
                $storedPath = $file->storeAs('resumes', $filename, 'local');
                $applicant->update(['resume_file' => $storedPath]);
            }

            if ($request->hasFile('profile_picture')) {
                $file = $request->file('profile_picture');
                $filename = time() . '_profile_' . preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
                $path = $file->storeAs('profile_pictures', $filename, 'public');
                $applicant->update(['profile_picture' => $path]);
            }

            $docFields = [
                'sss_document' => 'sss',
                'tin_document' => 'tin',
                'pagibig_document' => 'pagibig',
                'philhealth_document' => 'philhealth',
            ];
            foreach ($docFields as $field => $prefix) {
                if ($request->hasFile($field) && $request->file($field)->isValid()) {
                    $file = $request->file($field);
                    $safeName = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
                    $filename = time() . "_{$prefix}_" . $safeName;
                    $storedPath = $file->storeAs('applicant_documents/' . $applicant->id, $filename, 'local');
                    Log::info('Stored applicant document', ['applicant_id' => $applicant->id, 'field' => $field, 'path' => $storedPath]);
                }
            }

            $applicant->refresh();

            $this->sendApplicationReceivedEmail($applicant);
            $this->notifyHrOfNewApplicant($applicant);
            
            // Log activity
            $this->logCreate('applicant', $applicant->id, $applicant->full_name);

            return response()->json([
                'message' => 'Applicant created successfully',
                'applicant' => $applicant
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error creating applicant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified applicant.
     */
    public function show($id)
    {
        $applicant = Applicant::findOrFail($id);
        $applicant->append(['full_name', 'resume_url', 'profile_picture_url']);
        return response()->json($applicant);
    }

    /**
     * Update the specified applicant.
     */
    public function update(Request $request, $id)
    {
        $applicant = Applicant::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:applicants,email,' . $id,
            'job_opening_id' => 'required|integer',
            'middle_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'birthday' => 'nullable|date',
            'gender' => 'nullable|in:Male,Female',
            'sss_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:12',
            'tin_no' => 'nullable|string|regex:/^[0-9\-]+$/|min:11|max:15',
            'pag_ibig_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:14',
            'philhealth_no' => 'nullable|string|regex:/^[0-9\-]+$/|size:14',
            'status' => 'nullable|in:New Applicant,Interview,Offer,Hired,Rejected',
            'notes' => 'nullable|string',
            'resume_file' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->except(['resume_file']);

        // Handle file upload
        if ($request->hasFile('resume_file')) {
            $file = $request->file('resume_file');
            $filename = time() . '_' . preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
            $storedPath = $file->storeAs("resumes" , $filename, 'local');

            if ($applicant->resume_file && Storage::disk('local')->exists($applicant->resume_file)) {
                Storage::disk('local')->delete($applicant->resume_file);
            }

            $data['resume_file'] = $storedPath;
        }

        if (!empty($data)) {
            $applicant->update($data);
        }

        return response()->json([
            'message' => 'Applicant updated successfully',
            'applicant' => $applicant
        ]);
    }

    /**
     * Update applicant status.
     */
    public function updateStatus(Request $request, $id)
    {
        $applicant = Applicant::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:New Applicant,Interview,Hired,Rejected',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $applicant->update([
            'status' => $request->status,
            'notes' => $request->notes ?? $applicant->notes,
        ]);

        $applicant->refresh();

        if ($applicant->status === 'Rejected') {
            $this->sendApplicantRejectedEmail($applicant);
        } else {
            $this->sendApplicantStatusUpdatedEmail($applicant);
        }
        
        // Log activity
        $this->logCustomActivity('update_status', "Updated applicant status to {$request->status}", 'applicant', $applicant->id);

        return response()->json([
            'message' => 'Applicant status updated successfully',
            'applicant' => $applicant
        ]);
    }

    /**
     * Reject applicant using dedicated endpoint.
     */
    public function reject(Request $request, $id)
    {
        $applicant = Applicant::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $notes = $request->notes ?? $applicant->notes;

        $applicant->update([
            'status' => 'Rejected',
            'notes' => $notes,
        ]);

        $applicant->refresh();

        $this->sendApplicantRejectedEmail($applicant);

        $this->logCustomActivity('reject', 'Rejected applicant', 'applicant', $applicant->id);

        return response()->json([
            'message' => 'Applicant rejected successfully',
            'applicant' => $applicant,
        ]);
    }

    /**
     * Schedule interview for applicant.
     */
    public function scheduleInterview(Request $request, $id)
    {
        $applicant = Applicant::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'interview_date' => 'required|date|after_or_equal:today',
            'interview_time' => 'required|string',
            'interviewer' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $interviewSchedule = [
            'date' => $request->interview_date,
            'time' => $request->interview_time,
            'interviewer' => $request->interviewer,
            'location' => $request->location,
            'notes' => $request->notes,
            'scheduled_at' => now()->toDateTimeString(),
        ];

        $applicant->update([
            'status' => 'Interview',
            'interview_schedule' => $interviewSchedule,
        ]);

        $applicant->refresh();
        $this->sendApplicantInterviewScheduledEmail($applicant, $interviewSchedule);

        return response()->json([
            'message' => 'Interview scheduled successfully',
            'applicant' => $applicant
        ]);
    }

    /**
     * Hire applicant and convert to employee.
     */
    public function hire(Request $request, $id)
    {
        $applicant = Applicant::findOrFail($id);

        // Debug: Log the incoming request data
        $validator = Validator::make($request->all(), [
            'position_id' => 'required|exists:positions,id',
            'salary' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Convert applicant to employee using User model method
            Log::info('Hiring applicant: starting conversion', [
                'applicant_id' => $applicant->id,
                'position_id' => $request->position_id,
                'applicant_has_resume' => !empty($applicant->resume_file),
                'resume_exists' => $applicant->resume_file ? Storage::disk('local')->exists($applicant->resume_file) : null,
            ]);

            // Sanitize applicant data: convert empty strings to null for cleaner data
            $applicantData = $applicant->toArray();
            $fieldsToSanitize = ['gender', 'phone', 'address', 'sss_no', 'tin_no', 'pag_ibig_no', 'philhealth_no', 'middle_name'];
            foreach ($fieldsToSanitize as $field) {
                if (isset($applicantData[$field]) && $applicantData[$field] === '') {
                    $applicantData[$field] = null;
                }
            }

            $employee = User::createFromApplicant(
                $applicantData,
                $request->position_id
            );

            Log::info('Hiring applicant: employee created', [
                'employee_id' => $employee->id,
                'employee_resume_file' => $employee->resume_file,
                'employee_resume_exists' => $employee->resume_file ? Storage::disk('local')->exists($employee->resume_file) : null,
            ]);

            // Override joining date if provided
            if ($request->start_date) {
                Log::info('Hiring applicant: overriding joining date', [
                    'employee_id' => $employee->id,
                    'new_joining_date' => $request->start_date,
                ]);
                $employee->update(['joining_date' => $request->start_date]);
            }

            // Update applicant status to hired
            Log::info('Hiring applicant: updating applicant status to Hired', [
                'applicant_id' => $applicant->id,
            ]);
            $applicant->update(['status' => 'Hired']);

            // Prepare account details
            $accountDetails = [
                'employee_id' => $employee->id,
                'username' => $employee->email,
                'password' => 'lapeco' . $employee->id,
                'email' => $employee->email,
                'temporary_password' => 'lapeco' . $employee->id,
            ];

            // Send hired notification email to applicant
            $this->sendApplicantHiredEmail($applicant, $accountDetails);

            DB::commit();
            
            // Log activity
            $this->logCustomActivity('hire', "Hired applicant {$applicant->full_name} as employee", 'applicant', $applicant->id, [
                'employee_id' => $employee->id,
                'position_id' => $request->position_id
            ]);

            return response()->json([
                'message' => 'Applicant hired successfully',
                'employee' => $employee,
                'applicant' => $applicant,
                'account_details' => $accountDetails
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Hiring applicant failed', [
                'applicant_id' => $applicant->id,
                'position_id' => $request->position_id,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Handle specific database constraint violations with user-friendly messages
            $errorMessage = $e->getMessage();
            $userFriendlyMessage = 'Failed to hire applicant';
            
            if (str_contains($errorMessage, 'Duplicate entry') && str_contains($errorMessage, 'users_email_unique')) {
                $userFriendlyMessage = 'Email address already exists. Please use a different email.';
            } else if (str_contains($errorMessage, 'Duplicate entry') && str_contains($errorMessage, 'users_employee_id_unique')) {
                $userFriendlyMessage = 'Employee ID already exists. Please use a different ID.';
            } else if (str_contains($errorMessage, 'Integrity constraint violation')) {
                $userFriendlyMessage = 'Data conflict detected. Please check all information and try again.';
            }
            
            return response()->json([
                'message' => $userFriendlyMessage,
                'error' => $userFriendlyMessage
            ], 500);
        }
    }

    /**
     * Remove the specified applicant.
     */
    public function destroy($id)
    {
        $applicant = Applicant::findOrFail($id);

        // Delete resume file if exists
        if ($applicant->resume_file && Storage::disk('local')->exists($applicant->resume_file)) {
            Storage::disk('local')->delete($applicant->resume_file);
        }

        $applicantName = $applicant->full_name;
        $applicantId = $applicant->id;
        $applicant->delete();
        
        // Log activity
        $this->logDelete('applicant', $applicantId, $applicantName);

        return response()->json([
            'message' => 'Applicant deleted successfully'
        ]);
    }

    /**
     * View an applicant's resume in the browser.
     */
    public function viewResume(Request $request, Applicant $applicant)
    {
        // Check if user is authenticated
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!$applicant->resume_file || !Storage::disk('local')->exists($applicant->resume_file)) {
            return response()->json(['message' => 'Resume not found'], 404);
        }

        $path = Storage::disk('local')->path($applicant->resume_file);
        $mimeType = mime_content_type($path);
        
        return response()->file($path, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . basename($applicant->resume_file) . '"'
        ]);
    }

    /**
     * Download an applicant's resume from private storage.
     */
    public function downloadResume(Request $request, Applicant $applicant)
    {
        // Check if user is authenticated
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!$applicant->resume_file || !Storage::disk('local')->exists($applicant->resume_file)) {
            return response()->json(['message' => 'Resume not found'], 404);
        }

        $filename = basename($applicant->resume_file);
        return response()->download(Storage::disk('local')->path($applicant->resume_file), $filename);
    }

    public function listDocuments(Request $request, Applicant $applicant)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $basePath = 'applicant_documents/' . $applicant->id;
        $files = Storage::disk('local')->exists($basePath) ? Storage::disk('local')->files($basePath) : [];

        $documents = array_map(function ($path) {
            $fullPath = Storage::disk('local')->path($path);
            return [
                'name' => basename($path),
                'path' => $path,
                'size' => Storage::disk('local')->size($path),
                'mime' => is_file($fullPath) ? mime_content_type($fullPath) : null,
            ];
        }, $files);

        return response()->json($documents);
    }

    public function viewDocument(Request $request, Applicant $applicant, string $filename)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $safe = basename($filename);
        $path = 'applicant_documents/' . $applicant->id . '/' . $safe;
        if (!Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $fullPath = Storage::disk('local')->path($path);
        $mimeType = mime_content_type($fullPath);
        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $safe . '"',
        ]);
    }

    public function downloadDocument(Request $request, Applicant $applicant, string $filename)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $safe = basename($filename);
        $path = 'applicant_documents/' . $applicant->id . '/' . $safe;
        if (!Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $fullPath = Storage::disk('local')->path($path);
        return response()->download($fullPath, $safe);
    }

    /**
     * Get recruitment statistics.
     */
    public function getStats()
    {
        $stats = [
            'total_applicants' => Applicant::count(),
            'new_applicants' => Applicant::where('status', 'New Applicant')->count(),
            'interviews_scheduled' => Applicant::where('status', 'Interview')->count(),
            'offers_made' => Applicant::where('status', 'Offer')->count(),
            'hired' => Applicant::where('status', 'Hired')->count(),
            'rejected' => Applicant::where('status', 'Rejected')->count(),
            'this_month' => Applicant::whereMonth('application_date', now()->month)
                                   ->whereYear('application_date', now()->year)
                                   ->count(),
        ];

        return response()->json($stats);
    }

    protected function sendApplicationReceivedEmail(Applicant $applicant): void
    {
        try {
            Mail::to($applicant->email)->send(new ApplicantApplicationReceived($applicant));
        } catch (\Throwable $exception) {
            Log::error('Failed to send application received email', [
                'applicant_id' => $applicant->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    protected function notifyHrOfNewApplicant(Applicant $applicant): void
    {
        $hrUsers = User::where('role', 'HR_MANAGER')->get(['id', 'first_name', 'last_name']);

        foreach ($hrUsers as $hrUser) {
            try {
                Notification::create([
                    'user_id' => $hrUser->id,
                    'type' => 'recruitment',
                    'title' => 'New applicant received',
                    'message' => sprintf('%s has submitted a new application.', $applicant->full_name),
                    'data' => [
                        'applicant_id' => $applicant->id,
                        'status' => $applicant->status,
                    ],
                ]);
            } catch (\Throwable $exception) {
                Log::error('Failed to create HR notification for applicant', [
                    'applicant_id' => $applicant->id,
                    'hr_user_id' => $hrUser->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    protected function sendApplicantStatusUpdatedEmail(Applicant $applicant): void
    {
        try {
            Mail::to($applicant->email)->send(new ApplicantStatusUpdated($applicant));
        } catch (\Throwable $exception) {
            Log::error('Failed to send applicant status updated email', [
                'applicant_id' => $applicant->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    protected function sendApplicantRejectedEmail(Applicant $applicant): void
    {
        try {
            Mail::to($applicant->email)->send(new ApplicantRejected($applicant));
        } catch (\Throwable $exception) {
            Log::error('Failed to send applicant rejected email', [
                'applicant_id' => $applicant->id,
                'email' => $applicant->email,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    protected function sendApplicantHiredEmail(Applicant $applicant, array $accountDetails): void
    {
        try {
            Mail::to($applicant->email)->send(new ApplicantHired($applicant, $accountDetails));
            Log::info('Hired notification email sent', [
                'applicant_id' => $applicant->id,
                'email' => $applicant->email,
            ]);
        } catch (\Throwable $exception) {
            Log::error('Failed to send applicant hired email', [
                'applicant_id' => $applicant->id,
                'email' => $applicant->email,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    protected function sendApplicantInterviewScheduledEmail(Applicant $applicant, array $interviewSchedule): void
    {
        try {
            Mail::to($applicant->email)->send(new ApplicantInterviewScheduled($applicant, $interviewSchedule));
        } catch (\Throwable $exception) {
            Log::error('Failed to send applicant interview scheduled email', [
                'applicant_id' => $applicant->id,
                'email' => $applicant->email,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
