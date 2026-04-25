// UI Toggles
function toggleForms() {
    document.getElementById('loginCard').classList.toggle('hidden');
    document.getElementById('registerCard').classList.toggle('hidden');
}

function toggleStudentFields() {
    const role = document.getElementById('regRole').value;
    const regNoGroup = document.getElementById('regNoGroup');
    if (role === 'student') {
        regNoGroup.style.display = 'block';
    } else {
        regNoGroup.style.display = 'none';
        document.getElementById('regNo').value = '';
    }
}

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    loginBtn.innerText = 'Connecting...';
    loginBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data));
            
            showToast('Login successful! Welcome ' + data.name);
            // Redirect based on role
            window.location.href = data.role + '-dashboard.html';
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Could not connect to server.', 'error');
    } finally {
        loginBtn.innerText = 'Sign In';
        loginBtn.disabled = false;
    }
});

// Register Handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const role = document.getElementById('regRole').value;
    const email = document.getElementById('regEmail').value;
    const register_number = document.getElementById('regNo').value;
    const department = document.getElementById('regDept').value;
    const password = document.getElementById('regPassword').value;
    const registerBtn = document.getElementById('registerBtn');

    registerBtn.innerText = 'Creating Account...';
    registerBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role, email, register_number, department, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Account created! Please wait for admin verification.');
            toggleForms();
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Could not connect to server.', 'error');
    } finally {
        registerBtn.innerText = 'Register Now';
        registerBtn.disabled = false;
    }
});
