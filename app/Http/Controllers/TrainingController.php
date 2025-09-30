<?php

namespace App\Http\Controllers;

use App\Models\TrainingProgram;
use App\Models\TrainingEnrollment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class TrainingController extends Controller
{
    /**
     * Display a listing of training programs with enrollment statistics.
     */
    public function index(): JsonResponse
    {
        $programs = TrainingProgram::with(['enrollments.user:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Add enrollment statistics to each program
        $programs->each(function ($program) {
            $enrollments = $program->enrollments;
            $program->enrolled_count = $enrollments->count();
            $program->completed_count = $enrollments->where('status', 'Completed')->count();
            $program->completion_rate = $program->enrolled_count > 0 
                ? round(($program->completed_count / $program->enrolled_count) * 100, 1) 
                : 0;
        });

        return response()->json($programs);
    }

    /**
     * Display a listing of all training programs.
     */
    public function programs(): JsonResponse
    {
        $programs = TrainingProgram::orderBy('created_at', 'desc')->get();
        return response()->json($programs);
    }

    /**
     * Store a newly created training program.
     */
    public function storeProgram(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'provider' => 'nullable|string|max:255',
            'duration' => 'nullable|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['required', Rule::in(['Draft', 'Active', 'Completed', 'Cancelled'])],
            'cost' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:100',
            'max_participants' => 'nullable|integer|min:1',
            'requirements' => 'nullable|string'
        ]);

        $program = TrainingProgram::create($validated);

        return response()->json([
            'message' => 'Training program created successfully',
            'program' => $program
        ], 201);
    }

    /**
     * Display the specified training program with enrollments.
     */
    public function show($id): JsonResponse
    {
        $program = TrainingProgram::with(['enrollments.user:id,name'])
            ->findOrFail($id);

        return response()->json($program);
    }

    /**
     * Update the specified training program.
     */
    public function updateProgram(Request $request, $id): JsonResponse
    {
        $program = TrainingProgram::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'provider' => 'nullable|string|max:255',
            'duration' => 'nullable|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['required', Rule::in(['Draft', 'Active', 'Completed', 'Cancelled'])],
            'cost' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:100',
            'max_participants' => 'nullable|integer|min:1',
            'requirements' => 'nullable|string'
        ]);

        $program->update($validated);

        return response()->json([
            'message' => 'Training program updated successfully',
            'program' => $program
        ]);
    }

    /**
     * Remove the specified training program.
     */
    public function destroyProgram($id): JsonResponse
    {
        $program = TrainingProgram::findOrFail($id);
        
        // Check if there are any enrollments
        $enrollmentCount = $program->enrollments()->count();
        if ($enrollmentCount > 0) {
            return response()->json([
                'message' => 'This program has existing enrollments. Deleting it will also remove all enrollment records.',
                'warning' => true,
                'enrollment_count' => $enrollmentCount,
                'program_id' => $id
            ], 200); // Changed from 422 to 200 to indicate it's a warning, not an error
        }

        $program->delete();

        return response()->json([
            'message' => 'Training program deleted successfully'
        ]);
    }

    /**
     * Force delete the specified training program with enrollments.
     */
    public function forceDestroyProgram($id): JsonResponse
    {
        $program = TrainingProgram::findOrFail($id);
        
        // Delete all enrollments first
        $program->enrollments()->delete();
        
        // Then delete the program
        $program->delete();

        return response()->json([
            'message' => 'Training program and all associated enrollments deleted successfully'
        ]);
    }

    /**
     * Get all enrollments for training programs.
     */
    public function enrollments(): JsonResponse
    {
        $enrollments = TrainingEnrollment::with(['program:id,title', 'user:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($enrollments);
    }

    /**
     * Enroll a user in a training program.
     */
    public function enroll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'program_id' => 'required|exists:training_programs,id',
            'user_id' => 'required|exists:users,id',
            'notes' => 'nullable|string'
        ]);

        // Check if user is already enrolled
        $existingEnrollment = TrainingEnrollment::where('program_id', $validated['program_id'])
            ->where('user_id', $validated['user_id'])
            ->first();

        if ($existingEnrollment) {
            return response()->json([
                'message' => 'User is already enrolled in this program'
            ], 422);
        }

        // Check program capacity
        $program = TrainingProgram::findOrFail($validated['program_id']);
        if ($program->max_participants) {
            $currentEnrollments = $program->enrollments()->count();
            if ($currentEnrollments >= $program->max_participants) {
                return response()->json([
                    'message' => 'Program has reached maximum capacity'
                ], 422);
            }
        }

        $enrollment = TrainingEnrollment::create([
            'program_id' => $validated['program_id'],
            'user_id' => $validated['user_id'],
            'status' => 'Not Started',
            'progress' => 0,
            'enrolled_at' => now(),
            'notes' => $validated['notes'] ?? null
        ]);

        $enrollment->load(['program:id,title', 'user:id,name']);

        return response()->json([
            'message' => 'User enrolled successfully',
            'enrollment' => $enrollment
        ], 201);
    }

    /**
     * Update enrollment status and progress.
     */
    public function updateEnrollment(Request $request, $id): JsonResponse
    {
        $enrollment = TrainingEnrollment::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['Not Started', 'In Progress', 'Completed', 'Dropped'])],
            'progress' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
            'score' => 'nullable|numeric|min:0|max:100'
        ]);

        // Auto-set completed_at when status changes to Completed
        if ($validated['status'] === 'Completed' && $enrollment->status !== 'Completed') {
            $validated['completed_at'] = now();
            $validated['progress'] = 100;
        }

        $enrollment->update($validated);

        $enrollment->load(['program:id,title', 'user:id,name']);

        return response()->json([
            'message' => 'Enrollment updated successfully',
            'enrollment' => $enrollment
        ]);
    }

    /**
     * Remove an enrollment.
     */
    public function unenroll($id): JsonResponse
    {
        $enrollment = TrainingEnrollment::findOrFail($id);
        $enrollment->delete();

        return response()->json([
            'message' => 'User unenrolled successfully'
        ]);
    }
}
