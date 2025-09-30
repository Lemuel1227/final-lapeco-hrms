<?php

namespace App\Http\Controllers;

use App\Models\Applicant;
use App\Models\User;
use App\Models\Position;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ApplicantController extends Controller
{


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

        $applicants = $query->orderBy('application_date', 'desc')->get();

        // Append the full_name attribute to each applicant
        $applicants->each(function ($applicant) {
            $applicant->append('full_name');
        });

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
                'birthday' => 'nullable|date',
                'gender' => 'nullable|in:Male,Female,Other',
                'resume_file' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // 5MB max
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            $data['application_date'] = now()->toDateString();

            // Handle file upload
            if ($request->hasFile('resume_file')) {
                $file = $request->file('resume_file');
                $filename = time() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('resumes', $filename, 'public');
                $data['resume_file'] = $path;
            }

            $applicant = Applicant::create($data);

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
        $applicant->append('full_name');
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
            'birthday' => 'nullable|date',
            'gender' => 'nullable|in:Male,Female,Other',
            'status' => 'nullable|in:New Applicant,Screening,Interview,Offer,Hired,Rejected',
            'notes' => 'nullable|string',
            'resume_file' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        if ($validator->fails()) {
            \Log::error('Hire validation failed:', $validator->errors()->toArray());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();

        // Handle file upload
        if ($request->hasFile('resume_file')) {
            // Delete old file if exists
            if ($applicant->resume_file) {
                Storage::disk('public')->delete($applicant->resume_file);
            }

            $file = $request->file('resume_file');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('resumes', $filename, 'public');
            $data['resume_file'] = $path;
        }

        $applicant->update($data);

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
            'status' => 'required|in:New Applicant,Screening,Interview,Offer,Hired,Rejected',
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

        return response()->json([
            'message' => 'Applicant status updated successfully',
            'applicant' => $applicant
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
        \Log::info('Hire request data:', $request->all());

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
            $employee = User::createFromApplicant(
                $applicant->toArray(),
                $request->position_id
            );

            // Override joining date if provided
            if ($request->start_date) {
                $employee->update(['joining_date' => $request->start_date]);
            }

            // Update applicant status to hired
            $applicant->update(['status' => 'Hired']);

            DB::commit();

            return response()->json([
                'message' => 'Applicant hired successfully',
                'employee' => $employee,
                'applicant' => $applicant,
                'account_details' => [
                    'employee_id' => $employee->id,
                    'username' => $employee->email, // Modal expects 'username' field
                    'password' => 'lapeco' . $employee->id, // Use the actual generated password
                    'email' => $employee->email, // Keep for backward compatibility
                    'temporary_password' => 'lapeco' . $employee->id, // Keep for backward compatibility
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Hire applicant error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            // Handle specific database constraint violations with user-friendly messages
            $errorMessage = $e->getMessage();
            $userFriendlyMessage = 'Failed to hire applicant';
            
            if (str_contains($errorMessage, 'Duplicate entry') && str_contains($errorMessage, 'users_email_unique')) {
                 $userFriendlyMessage = 'Email address already exists. Please use a different email.';
             } elseif (str_contains($errorMessage, 'Duplicate entry') && str_contains($errorMessage, 'users_employee_id_unique')) {
                 $userFriendlyMessage = 'Employee ID already exists. Please use a different ID.';
             } elseif (str_contains($errorMessage, 'Integrity constraint violation')) {
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
        if ($applicant->resume_file) {
            Storage::disk('public')->delete($applicant->resume_file);
        }

        $applicant->delete();

        return response()->json([
            'message' => 'Applicant deleted successfully'
        ]);
    }

    /**
     * Get recruitment statistics.
     */
    public function getStats()
    {
        $stats = [
            'total_applicants' => Applicant::count(),
            'new_applicants' => Applicant::where('status', 'New Applicant')->count(),
            'in_screening' => Applicant::where('status', 'Screening')->count(),
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
}
