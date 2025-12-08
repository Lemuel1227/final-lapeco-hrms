<?php

namespace Tests\Feature;

use App\Models\LeaveCashConversion;
use App\Models\User;
use App\Models\Position;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaveCashConversionTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigned_employee_can_submit_request()
    {
        $position = Position::create(['name' => 'HR', 'allowed_modules' => ['leave_management']]);
        $user = User::factory()->create([
            'role' => 'REGULAR_EMPLOYEE', 
            'position_id' => $position->id,
            'password' => bcrypt('password')
        ]);
        
        $conversion = LeaveCashConversion::create([
            'user_id' => $user->id,
            'year' => 2024,
            'status' => 'Pending',
            'vacation_days' => 5,
            'sick_days' => 5,
            'conversion_rate' => 100,
            'total_amount' => 1000,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/leave-cash-conversions/{$conversion->id}/status", [
            'status' => 'Submitted'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Submitted', $conversion->fresh()->status);
    }

    public function test_assigned_employee_cannot_approve_request()
    {
        $position = Position::create(['name' => 'HR', 'allowed_modules' => ['leave_management']]);
        $user = User::factory()->create([
            'role' => 'REGULAR_EMPLOYEE', 
            'position_id' => $position->id,
            'password' => bcrypt('password')
        ]);
        
        $conversion = LeaveCashConversion::create([
            'user_id' => $user->id,
            'year' => 2024,
            'status' => 'Submitted',
            'vacation_days' => 5,
            'sick_days' => 5,
            'conversion_rate' => 100,
            'total_amount' => 1000,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/leave-cash-conversions/{$conversion->id}/status", [
            'status' => 'Approved'
        ]);

        $response->assertStatus(403);
    }

    public function test_assigned_employee_can_mark_approved_as_paid()
    {
        $position = Position::create(['name' => 'HR', 'allowed_modules' => ['leave_management']]);
        $user = User::factory()->create([
            'role' => 'REGULAR_EMPLOYEE', 
            'position_id' => $position->id,
            'password' => bcrypt('password')
        ]);
        
        $conversion = LeaveCashConversion::create([
            'user_id' => $user->id,
            'year' => 2024,
            'status' => 'Approved',
            'vacation_days' => 5,
            'sick_days' => 5,
            'conversion_rate' => 100,
            'total_amount' => 1000,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/leave-cash-conversions/{$conversion->id}/status", [
            'status' => 'Paid'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Paid', $conversion->fresh()->status);
        $this->assertNotNull($conversion->fresh()->paid_at);
        $this->assertEquals($user->id, $conversion->fresh()->paid_by);
    }

    public function test_super_admin_can_approve_request()
    {
        $user = User::factory()->create([
            'role' => 'SUPER_ADMIN',
            'password' => bcrypt('password')
        ]);
        
        $conversion = LeaveCashConversion::create([
            'user_id' => $user->id,
            'year' => 2024,
            'status' => 'Submitted',
            'vacation_days' => 5,
            'sick_days' => 5,
            'conversion_rate' => 100,
            'total_amount' => 1000,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/leave-cash-conversions/{$conversion->id}/status", [
            'status' => 'Approved'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Approved', $conversion->fresh()->status);
    }

    public function test_super_admin_can_pay_request()
    {
        $user = User::factory()->create([
            'role' => 'SUPER_ADMIN',
            'password' => bcrypt('password')
        ]);
        
        $conversion = LeaveCashConversion::create([
            'user_id' => $user->id,
            'year' => 2024,
            'status' => 'Approved',
            'vacation_days' => 5,
            'sick_days' => 5,
            'conversion_rate' => 100,
            'total_amount' => 1000,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/leave-cash-conversions/{$conversion->id}/status", [
            'status' => 'Paid'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Paid', $conversion->fresh()->status);
        $this->assertNotNull($conversion->fresh()->paid_at);
        $this->assertEquals($user->id, $conversion->fresh()->paid_by);
    }
}
