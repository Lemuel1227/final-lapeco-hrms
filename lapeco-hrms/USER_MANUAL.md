# 📘 Lapeco HRMS User Manual

**Version:** 1.1  
**Last Updated:** December 09, 2025

Welcome to the **Lapeco Human Resource Management System (HRMS)**. This manual provides a comprehensive step-by-step guide to using the system's modules to efficiently manage your workforce.

---

## 📋 Table of Contents

1. [Employee Data Management](#1-employee-data-management)
2. [Attendance Management](#2-attendance-management)
3. [Payroll Management](#3-payroll-management)
4. [Leave Management](#4-leave-management)
5. [Recruitment](#5-recruitment)
6. [Performance Management](#6-performance-management)
7. [Training and Development](#7-training-and-development)
8. [Positions Management](#8-positions-management)
9. [Reports](#9-reports)

---

## 1. Employee Data Management

> **Manage the central database of all employees.**

📍 **Location:** `Employee Data` page

### 📝 Step-by-Step Guides

#### How to Add a New Employee
1.  Navigate to the **Employee Data** page.
2.  Click the **"New Employee"** button located at the top right.
3.  **Personal Details**: Enter the employee's Name, Birthday, Gender, and Contact information.
4.  **Employment Details**: Select the Position, Role, Joining Date, and enter Statutory IDs (SSS, PhilHealth, Pag-IBIG, TIN).
5.  **Documents**: Upload the employee's Resume and Profile Picture (optional).
6.  Click **"Save"** to create the record.
    *   *Note: A system-generated account will be created for the employee.*

#### How to Edit Employee Information
1.  Locate the employee card in the list.
2.  Click the **Edit** (pencil) icon on the employee card.
3.  Update the necessary information in the modal.
4.  Click **"Save Changes"**.

#### How to Delete an Employee
1.  Locate the employee card.
2.  Click the **Delete** (trash) icon.
3.  Confirm the action in the warning modal.
    *   ⚠️ **Warning**: This action is permanent and cannot be undone.

#### How to Search and Filter
*   **Search**: Use the search bar at the top to find employees by Name or ID.
*   **Filter**: Use the dropdowns to filter by **Status** (Active/Inactive), **Position**, or **Joining Date**.

#### How to Export Employee Data
1.  Click the **"Generate Report"** button.
2.  The system will generate and download the Employee List report.

---

## 2. Attendance Management

> **Track and manage daily employee attendance logs.**

📍 **Location:** `Attendance` page

### 📝 Step-by-Step Guides

#### How to Import Attendance Logs
1.  Navigate to the **Attendance** page.
2.  Click the **"Import Excel"** button.
3.  Select your biometric log file (`.xlsx` or `.csv`).
4.  Review the data in the **Import Preview** modal.
5.  Click **"Confirm Import"** to save the logs.

#### How to View Attendance
*   **Daily View**: Check the main table for the current date's logs.
*   **History View**: Switch to the **History** tab to see monthly summaries.
*   **By Employee**: Click on an employee's name to see their specific logs.

#### How to Manually Edit Attendance
1.  Find the specific attendance record.
2.  Click the **Edit** icon (pencil) next to the record.
3.  Adjust the **Time In** or **Time Out** values.
4.  Click **"Save"**.

#### How to Generate Attendance Reports
1.  Click the **"Generate Report"** button on the Attendance page.
2.  Select the **Date Range** and other filters.
3.  Click **"Download"** to get the report.

---

## 3. Payroll Management

> **Manage payroll processing, payslip generation, and statutory deductions.**

📍 **Location:** `Payroll` page

### 📝 Step-by-Step Guides

#### How to Generate Payroll
1.  Go to the **"Payroll Generation"** tab.
2.  Select the **Start Date** and **End Date** for the payroll period.
3.  Review the summary displayed (Employees included, Total Projected Gross).
4.  Click **"Generate Payroll"**.
5.  Confirm the action to create the payroll run.

#### How to Manage Past Payrolls
1.  Navigate to the **"Generated Payrolls"** tab.
2.  **View Details**: Click on a payroll run to see the breakdown of gross pay, deductions, and net pay.
3.  **Mark as Paid**: Click the **"Mark as Paid"** button to finalize the run.
4.  **Delete**: If a run is incorrect and unpaid, click the **Delete** button.

#### How to Configure Deduction Rules
1.  Go to the **"Deduction Rules"** tab.
2.  Select the deduction type (SSS, PhilHealth, or Pag-IBIG).
3.  Update the contribution tables or tax brackets as needed.
4.  Save your changes.

---

## 4. Leave Management

> **Handle employee leave requests, approvals, and credit balances.**

📍 **Location:** `Leave Management` page

### 📝 Step-by-Step Guides

#### How to Approve or Decline Leave Requests
1.  Navigate to the **Leave Management** page.
2.  Review the list of **Pending** requests.
3.  **View Details**: Click on a request to see reasons and attachments (e.g., medical certificates).
4.  Click **"Approve"** to grant the leave, or **"Decline"** to reject it.

#### How to Manage Leave Credits
1.  Go to the **"Leave Credits"** tab.
2.  Find the employee you wish to update.
3.  **Adjust Credits**: Click the edit icon to manually add or deduct leave credits.
4.  **Bulk Add**: Use the **"Bulk Add Credits"** button to add credits to multiple employees at once.

#### How to Process Cash Conversion
1.  Go to the **"Cash Conversion"** tab.
2.  Review the list of employees with convertible leave credits.
3.  Select the employees or click **"Convert All"**.
4.  Confirm the conversion to process the payments.

---

## 5. Recruitment

> **Manage the hiring pipeline from application to hiring.**

📍 **Location:** `Recruitment` page

### 📝 Step-by-Step Guides

#### How to Add a New Applicant
1.  Navigate to the **Recruitment** page.
2.  Click **"New Applicant"**.
3.  Fill in the applicant's details or upload their resume.
4.  Click **"Save"**.

#### How to Manage Applicant Status
1.  Find the applicant card in the pipeline.
2.  Click the **Actions** dropdown menu.
3.  Select an action:
    *   **Schedule Interview**: Move to "Interview" stage and set a date/time.
    *   **Hire**: Move to "Hired" stage and generate an employee record.
    *   **Reject**: Move to "Rejected" stage.

#### How to Manage Chatbot Q&A
1.  Go to the **"Chatbot Management"** tab.
2.  Add or edit the Questions and Answers used by the AI chatbot for screening.
3.  Save your changes to update the chatbot's knowledge base.

---

## 6. Performance Management

> **Track and manage employee performance evaluations.**

📍 **Location:** `Performance` page

### 📝 Step-by-Step Guides

#### How to Manage Evaluation Periods
1.  Navigate to the **Performance** page.
2.  Click **"Manage Periods"**.
3.  Click **"New Period"** to create a cycle (e.g., "Annual Review 2025").
4.  Set the **Start Date** and **End Date**.
5.  Click **"Save"**.

#### How to Track Evaluations
1.  Go to the **"Evaluation Tracker"** tab.
2.  Monitor the progress bar to see completion rates.
3.  View the list to identify which teams or employees have pending evaluations.

#### How to Generate Performance Reports
1.  Click the **"Generate Report"** button.
2.  Select the evaluation period and report type.
3.  Download the summary report.

---

## 7. Training and Development

> **Manage training programs and employee enrollments.**

📍 **Location:** `Training` page

### 📝 Step-by-Step Guides

#### How to Create a Training Program
1.  Navigate to the **Training** page.
2.  Click **"New Program"**.
3.  Enter the program title, description, and schedule.
4.  Click **"Save"**.

#### How to Enroll Employees
1.  Select a training program.
2.  Click **"Enroll Employee"**.
3.  Select the employees you wish to add.
4.  Confirm the enrollment.

#### How to Update Enrollment Status
1.  Go to the program details view.
2.  Find the employee in the list.
3.  Update their status to **"In Progress"** or **"Completed"**.

---

## 8. Positions Management

> **Define job roles and their corresponding compensation structures.**

📍 **Location:** `Positions` page

### 📝 Step-by-Step Guides

#### How to Create or Edit a Position
1.  Navigate to the **Positions** page.
2.  Click **"New Position"** or edit an existing one.
3.  **Details**: Enter the Job Title.
4.  **Compensation**: Set the **Monthly Salary**, **Base Rate**, **Overtime Rates**, and **Night Differential**.
5.  **Limits**: Set the **Max Team Leaders** allowed.
6.  **Permissions**: Select the system modules this position can access.
7.  Click **"Save"**.

#### How to Assign Employees to Positions
1.  In the position card, click **"Add Employee"**.
2.  Select the employee from the list.
3.  Confirm the assignment.
    *   *Note: This will update the employee's current position and compensation details.*

---

## 9. Reports

> **Generate comprehensive reports and view predictive analytics.**

📍 **Location:** `Reports` page

### 📝 Step-by-Step Guides

#### How to Generate a Report
1.  Navigate to the **Reports** page.
2.  Browse the available report categories (e.g., Payroll, Attendance, Performance).
3.  Click on a **Report Card** (e.g., "Payroll Summary").
4.  **Configure**: In the modal, select the **Date Range**, **Department**, or other parameters.
5.  Click **"Generate"**.
6.  Preview the data and click **"Download PDF"** to save the file.
