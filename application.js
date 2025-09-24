const companies = [
  {
    name: "HCLTech Inc.",
    details: "Leading global IT services company specializing in digital and cloud solutions."
  },
  {
    name: "Infosys Ltd.",
    details: "One of India's largest IT companies focused on consulting and outsourcing services."
  },
  {
    name: "Tata Consultancy Services",
    details: "Global IT services and consulting leader with a wide range of technology solutions."
  },
  {
    name: "Wipro Technologies",
    details: "Multinational corporation providing information technology, consulting, and business process services."
  },
  {
    name: "Accenture India",
    details: "Leading global professional services company providing strategy, consulting, digital, technology, and operations services."
  }
];

let nextAccept = true; // to alternate accept/reject applications

// Utility to generate interview date in next 1-9 days and time in IST
function generateInterviewDateIST() {
  const now = new Date();
  const daysAhead = Math.floor(Math.random() * 9) + 1;
  const interviewDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const hour = Math.floor(Math.random() * 10) + 9; // hours from 9am to 6pm
  interviewDate.setHours(hour);
  interviewDate.setMinutes(Math.floor(Math.random() * 60));
  interviewDate.setSeconds(0);
  interviewDate.setMilliseconds(0);
  // Convert to IST string (UTC +5:30)
  const istOffset = 5 * 60 + 30;
  const istDate = new Date(interviewDate.getTime() + istOffset * 60 * 1000);
  return istDate.toLocaleString('en-IN', { hour12: true });
}

// Render company listings dynamically
function renderCompanies() {
  const container = document.getElementById('companies');
  container.innerHTML = '';
  companies.forEach(c => {
    const div = document.createElement('div');
    div.className = 'company-block';
    div.innerHTML = `
      <h3>${c.name}</h3>
      <p>${c.details}</p>
      <button onclick="openApplicationModal('${c.name}')">Apply</button>
    `;
    container.appendChild(div);
  });
}

// Show the application form modal
function openApplicationModal(company) {
  document.getElementById('applicationModal').style.display = 'block';
  document.getElementById('modalCompanyName').textContent = company;
  document.getElementById('applicationResult').textContent = '';
  const form = document.getElementById('applicationForm');
  form.reset();
  form.company = company;
}

// Close/hide the modal
function closeModal() {
  document.getElementById('applicationModal').style.display = 'none';
}

// Handle form submission, alternate accept/reject logic
function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const company = form.company;
  const name = form.name.value.trim();
  const applicationsList = document.getElementById('applicationsList');
  let message = '';

  if (nextAccept) {
    const interviewDate = generateInterviewDateIST();
    message = `Application accepted! Interview scheduled on ${interviewDate}.`;
    const li = document.createElement('li');
    li.textContent = `${company} - Interview Scheduled for ${interviewDate}`;
    applicationsList.appendChild(li);
  } else {
    message = `Application rejected. Suggestions: improve skills in algorithms, practice coding tests, and update your resume.`;
    alert(message);
  }

  document.getElementById('applicationResult').textContent = message;
  setTimeout(() => {
    document.getElementById('applicationResult').textContent = '';
    closeModal();
  }, 4000);

  nextAccept = !nextAccept; // flip accept/reject for next submission
}

document.addEventListener('DOMContentLoaded', () => {
  renderCompanies();
  document.getElementById('applicationForm').addEventListener('submit', handleSubmit);
  // Clear application list on tab close (rejected vanish)
  window.addEventListener('beforeunload', () => {
    document.getElementById('applicationsList').innerHTML = '';
  });
});
