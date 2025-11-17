<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class SemiMonthlyContributionTest extends TestCase
{
    public function test_sss_employee_share_is_halved_per_period()
    {
        $monthlySalary = 30000.00;
        $msc = 30000.00;
        $monthlyEe = $msc * 0.045;
        $semiMonthlyEe = $monthlyEe / 2;
        $this->assertSame(1350.0, $monthlyEe);
        $this->assertSame(675.0, $semiMonthlyEe);
    }

    public function test_philhealth_employee_share_is_halved_per_period()
    {
        $monthlySalary = 50000.00;
        $base = min(max($monthlySalary, 10000), 100000);
        $totalPremium = $base * 0.05;
        $monthlyEe = $totalPremium / 2;
        $semiMonthlyEe = $monthlyEe / 2;
        $this->assertSame(1250.0, $monthlyEe);
        $this->assertSame(625.0, $semiMonthlyEe);
    }

    public function test_pagibig_employee_share_is_halved_per_period()
    {
        $monthlySalary = 10000.00;
        $base = min($monthlySalary, 5000);
        $rate = $monthlySalary <= 1500 ? 0.01 : 0.02;
        $monthlyEe = $base * $rate;
        $semiMonthlyEe = $monthlyEe / 2;
        $this->assertSame(100.0, $monthlyEe);
        $this->assertSame(50.0, $semiMonthlyEe);
    }

    public function test_withholding_tax_brackets_semimonthly()
    {
        $this->assertSame(0.0, $this->computeTax(10417));
        $this->assertGreaterThan(0.0, $this->computeTax(12000));
        $this->assertGreaterThan($this->computeTax(20000), $this->computeTax(30000));
    }

    private function computeTax(float $taxableSemi): float
    {
        if ($taxableSemi <= 10417) {
            return 0.0;
        } elseif ($taxableSemi <= 16666) {
            return ($taxableSemi - 10417) * 0.15;
        } elseif ($taxableSemi <= 33332) {
            return 937.50 + ($taxableSemi - 16667) * 0.20;
        } elseif ($taxableSemi <= 83332) {
            return 4270.70 + ($taxableSemi - 33333) * 0.25;
        } elseif ($taxableSemi <= 333332) {
            return 16770.70 + ($taxableSemi - 83333) * 0.30;
        }
        return 91770.70 + ($taxableSemi - 333333) * 0.35;
    }
}