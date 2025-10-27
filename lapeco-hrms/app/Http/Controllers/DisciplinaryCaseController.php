<?php
 
 namespace App\Http\Controllers;
 
 use App\Models\DisciplinaryCase;
 use App\Models\User;
 use Illuminate\Http\Request;
 use Illuminate\Http\JsonResponse;
 use Illuminate\Validation\Rule;
 use Illuminate\Support\Facades\Storage;
 use App\Traits\LogsActivity;
 
 class DisciplinaryCaseController extends Controller
 {
     use LogsActivity;
     private const ALLOWED_REASONS = [
         'Tardiness / Punctuality',
         'Safety Violation',
         'Insubordination',
         'Company Policy Violation',
         'Poor Performance',
         'Misconduct',
         'Other',
     ];
 
     /**
      * Display a listing of disciplinary cases.
      */
     public function index(): JsonResponse
     {
         $cases = DisciplinaryCase::with(['employee:id,first_name,middle_name,last_name', 'actionLogs'])
             ->orderBy('created_at', 'desc')
             ->get();
 
         return response()->json($cases);
     }
 
     /**
      * Store a newly created disciplinary case.
      */
     public function store(Request $request): JsonResponse
     {
         $validated = $request->validate([
             'employee_id' => 'required|exists:users,id',
             'action_type' => 'required|string|max:255',
             'description' => 'required|string',
             'incident_date' => 'required|date',
             'reason' => ['required', 'string', 'max:255', Rule::in(self::ALLOWED_REASONS)],
             'status' => 'nullable|string|max:255',
             'resolution_taken' => 'nullable|string',
             'attachment' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,txt|max:5120',
             'reported_by' => 'nullable|exists:users,id',
             'approval_status' => 'nullable|in:pending,approved'
         ]);
 
         $user = $request->user();
         $reportedById = $validated['reported_by'] ?? ($user ? $user->id : null);
         if (!$reportedById && $user) {
             $reportedById = $user->id;
         }
 
         $approvalStatus = $validated['approval_status'] ?? (($user && $user->role === 'HR_PERSONNEL') ? 'approved' : 'pending');
         $status = $validated['status'] ?? null;
         if ($user && $user->role !== 'HR_PERSONNEL') {
             $status = 'Ongoing';
         } else {
             $status = $status ?? 'Ongoing';
         }
 
         $caseData = $validated;
         unset($caseData['attachment']);
 
         $case = DisciplinaryCase::create(array_merge($caseData, [
             'reported_by' => $reportedById,
             'approval_status' => $approvalStatus,
             'status' => $status,
         ]));
 
         $attachments = [];
         if ($request->hasFile('attachment')) {
             $file = $request->file('attachment');
             $safeName = time() . '_' . preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
             $storedPath = $file->storeAs("private/disciplinary_cases/{$case->id}", $safeName, 'local');
             $case->attachment = basename($storedPath);
             $case->save();
             $attachments[] = basename($storedPath);
         }
 
         if (empty($attachments)) {
             $dir = "private/disciplinary_cases/{$case->id}";
             if (Storage::disk('local')->exists($dir)) {
                 $attachments = array_map('basename', Storage::disk('local')->files($dir));
             }
         }
 
         // Load the employee relationship
         $case->load('employee:id,first_name,middle_name,last_name');
         
         // Log activity
         $employeeName = $case->employee ? 
             trim($case->employee->first_name . ' ' . $case->employee->last_name) : 
             'Employee';
         $this->logCreate('disciplinary_case', $case->id, "Case for {$employeeName} - {$case->action_type}");
 
         return response()->json(array_merge($case->toArray(), [
             'attachments' => $attachments,
         ]), 201);
     }
 
     /**
      * Display the specified disciplinary case.
      */
     public function show(DisciplinaryCase $disciplinaryCase): JsonResponse
     {
         $disciplinaryCase->load(['employee:id,first_name,middle_name,last_name', 'actionLogs']);
         // Use LOCAL disk and PRIVATE directory to keep attachments non-public
         $dir = "private/disciplinary_cases/{$disciplinaryCase->id}";
         $files = Storage::disk('local')->exists($dir)
             ? array_map('basename', Storage::disk('local')->files($dir))
             : [];
         $data = $disciplinaryCase->toArray();
         $data['attachments'] = $files;
         return response()->json($data);
     }
 
     /**
      * Update the specified disciplinary case.
      */
     public function update(Request $request, DisciplinaryCase $disciplinaryCase): JsonResponse
     {
         $validated = $request->validate([
             'employee_id' => 'sometimes|exists:users,id',
             'action_type' => 'sometimes|string|max:255',
             'description' => 'sometimes|string',
             'incident_date' => 'sometimes|date',
             'reason' => ['sometimes', 'string', 'max:255', Rule::in(self::ALLOWED_REASONS)],
             'status' => 'sometimes|string|max:255',
             'resolution_taken' => 'nullable|string',
             'attachment' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,txt|max:5120',
             'reported_by' => 'sometimes|nullable|exists:users,id',
             'approval_status' => 'sometimes|in:pending,approved,declined'
         ]);
 
         $updateData = $validated;
         unset($updateData['attachment']);
 
         if ($request->hasFile('attachment')) {
             $file = $request->file('attachment');
             $safeName = time() . '_' . preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
             $storedPath = $file->storeAs("private/disciplinary_cases/{$disciplinaryCase->id}", $safeName, 'local');
 
             $existingAttachment = $disciplinaryCase->attachment;
             if ($existingAttachment) {
                 $existingPath = "private/disciplinary_cases/{$disciplinaryCase->id}/{$existingAttachment}";
                 if (Storage::disk('local')->exists($existingPath)) {
                     Storage::disk('local')->delete($existingPath);
                 }
             }
 
             $updateData['attachment'] = basename($storedPath);
         }
 
         if (!empty($updateData)) {
             $disciplinaryCase->update($updateData);
         }
 
         $dir = "private/disciplinary_cases/{$disciplinaryCase->id}";
         $attachments = Storage::disk('local')->exists($dir)
             ? array_map('basename', Storage::disk('local')->files($dir))
             : [];
 
         $disciplinaryCase->load('employee:id,first_name,middle_name,last_name');
         
         // Log activity
         $this->logUpdate('disciplinary_case', $disciplinaryCase->id, "Disciplinary case #{$disciplinaryCase->id}");
 
         return response()->json(array_merge($disciplinaryCase->toArray(), [
             'attachments' => $attachments,
         ]));
     }
 
     /**
      * Remove the specified disciplinary case.
      */
     public function destroy(DisciplinaryCase $disciplinaryCase): JsonResponse
     {
         $caseId = $disciplinaryCase->id;
         $disciplinaryCase->delete();
         
         // Log activity
         $this->logDelete('disciplinary_case', $caseId, "Disciplinary case #{$caseId}");
         
         return response()->json(['message' => 'Disciplinary case deleted successfully']);
     }
 
     /**
      * Get disciplinary cases for the currently authenticated employee.
      * This allows employees to view their own cases without requiring special permissions.
      */
     public function getMyCases(Request $request): JsonResponse
     {
         $user = $request->user();
        
         if (!$user) {
             return response()->json(['message' => 'Unauthorized'], 401);
         }
        
         $cases = DisciplinaryCase::where('employee_id', $user->id)
             ->with(['employee:id,first_name,middle_name,last_name', 'actionLogs'])
             ->orderBy('created_at', 'desc')
             ->get();

         return response()->json($cases);
     }
 
     /**
      * Get disciplinary cases by employee.
      */
     public function getByEmployee(User $employee): JsonResponse
     {
         $cases = DisciplinaryCase::where('employee_id', $employee->id)
             ->with('employee:id,first_name,middle_name,last_name')
             ->orderBy('created_at', 'desc')
             ->get();

         return response()->json($cases);
     }
 
     /**
      * Get cases by status.
      */
     public function getByStatus(string $status): JsonResponse
     {
         $cases = DisciplinaryCase::where('status', $status)
             ->with('employee:id,first_name,middle_name,last_name')
             ->orderBy('created_at', 'desc')
             ->get();
 
         return response()->json($cases);
     }
 
     /**
      * Get disciplinary cases grouped by employee.
      */
     public function getGroupedByEmployee(): JsonResponse
     {
         $casesGroupedByEmployee = DisciplinaryCase::with('employee:id,first_name,middle_name,last_name')
             ->get()
             ->groupBy('employee_id')
             ->map(function ($cases, $employeeId) {
                 return [
                     'employee' => $cases->first()->employee,
                     'total_cases' => $cases->count(),
                     'cases' => $cases->map(function ($case) {
                         return [
                             'id' => $case->id,
                             'action_type' => $case->action_type,
                             'description' => $case->description,
                             'incident_date' => $case->incident_date,
                             'reason' => $case->reason,
                             'status' => $case->status,
                             'resolution_taken' => $case->resolution_taken,
                             'attachment' => $case->attachment,
                             'created_at' => $case->created_at,
                             'updated_at' => $case->updated_at
                         ];
                     })->sortByDesc('incident_date')->values()
                 ];
             })
             ->sortBy('employee.name')
             ->values();
 
         return response()->json($casesGroupedByEmployee);
     }
 
     /**
      * Get cases statistics.
      */
     public function getStatistics(): JsonResponse
     {
         $stats = [
             'total_cases' => DisciplinaryCase::count(),
             'by_status' => DisciplinaryCase::select('status')
                 ->selectRaw('count(*) as count')
                 ->groupBy('status')
                 ->pluck('count', 'status'),
             'by_action_type' => DisciplinaryCase::select('action_type')
                 ->selectRaw('count(*) as count')
                 ->groupBy('action_type')
                 ->pluck('count', 'action_type'),
             'recent_cases' => DisciplinaryCase::with('employee:id,first_name,middle_name,last_name')
                 ->orderBy('created_at', 'desc')
                 ->limit(5)
                 ->get()
         ];
 
         return response()->json($stats);
     }
 
     /**
      * Upload an attachment for a disciplinary case (PRIVATE storage).
      */
     public function uploadAttachment(Request $request, DisciplinaryCase $disciplinaryCase): JsonResponse
     {
         $request->validate([
             'attachment' => 'required|file|mimes:pdf,doc,docx,jpg,jpeg,png,txt|max:5120',
         ]);
 
         $file = $request->file('attachment');
         $safeName = time() . '_' . preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
         $storedPath = $file->storeAs("private/disciplinary_cases/{$disciplinaryCase->id}", $safeName, 'local');
 
         return response()->json([
             'message' => 'Attachment uploaded successfully',
             'filename' => basename($storedPath),
             'path' => $storedPath,
         ], 201);
     }
 
     /**
      * Download a specific attachment (PRIVATE storage).
      */
     public function downloadAttachment(DisciplinaryCase $disciplinaryCase, string $filename)
     {
         $filename = basename($filename);
         $path = "private/disciplinary_cases/{$disciplinaryCase->id}/{$filename}";
         if (!Storage::disk('local')->exists($path)) {
             return response()->json(['message' => 'File not found'], 404);
         }
         $fullPath = Storage::disk('local')->path($path);
         return response()->download($fullPath, $filename);
     }
 
     /**
      * Delete a specific attachment (PRIVATE storage).
      */
     public function deleteAttachment(DisciplinaryCase $disciplinaryCase, string $filename): JsonResponse
     {
         $filename = basename($filename);
         $path = "private/disciplinary_cases/{$disciplinaryCase->id}/{$filename}";
         if (!Storage::disk('local')->exists($path)) {
             return response()->json(['message' => 'File not found'], 404);
         }
         Storage::disk('local')->delete($path);
         return response()->json(['message' => 'Attachment deleted successfully']);
     }
 }