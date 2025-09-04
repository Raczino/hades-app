export const registrationRequest = async (firstName, lastName, email, password = '') => {
    const response = await fetch('http://localhost:8080/api/v1/registration', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, email, password }),
    });
    return response.status;
};

export const loginRequest = async (email, password = '') => {
    const response = await fetch('http://localhost:8080/api/v1/auth/authenticate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
    });
    return response;
};