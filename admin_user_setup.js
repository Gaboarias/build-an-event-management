(() => {
  const users = JSON.parse(localStorage.getItem('users')) || [];
  if (!users.some(user => user.email === 'admin@admin.com')) {
    users.push({
      email: 'admin@admin.com',
      password: 'admin123', // default password, should be changed
      role: 'admin'
    });
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Admin user created: admin@admin.com');
  } else {
    console.log('Admin user already exists');
  }
})();
