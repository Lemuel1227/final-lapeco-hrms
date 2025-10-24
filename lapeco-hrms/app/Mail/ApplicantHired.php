<?php

namespace App\Mail;

use App\Models\Applicant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ApplicantHired extends Mailable
{
    use Queueable, SerializesModels;

    public Applicant $applicant;
    public array $accountDetails;

    public function __construct(Applicant $applicant, array $accountDetails)
    {
        $this->applicant = $applicant;
        $this->accountDetails = $accountDetails;
    }

    public function build(): self
    {
        return $this
            ->subject('Congratulations! You have been hired - Lapeco HRMS')
            ->view('emails.applicant.hired')
            ->with([
                'applicantName' => $this->applicant->full_name,
                'username' => $this->accountDetails['username'],
                'password' => $this->accountDetails['password'],
                'employeeId' => $this->accountDetails['employee_id'],
            ]);
    }
}
