import { buildSchema } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import { ruruHTML } from 'ruru/server';
import express from 'express';

const departments = [
    { id: 10, name: 'Administration', location: 'HQ' },
    { id: 20, name: 'IT', location: 'Remote' },
];

const employees = [
    { id: 1, firstName: 'Steven', lastName: 'León', email: 'steven@example.com', salary: 70000, departmentId: 10, managerId: 2 },
    { id: 2, firstName: 'Nicolas', lastName: 'Muñoz', email: 'nicolas@example.com', salary: 65000, departmentId: 20, managerId: 3 },
    { id: 3, firstName: 'William', lastName: 'Gonzalez', email: 'william@example.com', salary: 50000, departmentId: 10, managerId: 4 },
    { id: 4, firstName: 'Camila', lastName: 'Valencia', email: 'Camila@correo.com', salary: 999999, departmentId: 10, managerId: null }
];

const schema = buildSchema(`
    type Employee {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    salary: Float!
    department: Department!
    manager: Employee
}

type Department {
    id: ID!
    name: String!
    location: String!
}


type Query {
    getEmployee(id: ID!): Employee
    getAllEmployees: [Employee!]!
    getDepartment(id: ID!): Department
    getAllDepartments: [Department!]!
}

type Mutation {
    createEmployee(firstName: String!, lastName: String!, email: String!, salary: Float!, departmentId: ID!, managerId: ID): Employee!
    updateEmployee(id: ID!, firstName: String, lastName: String, email: String, salary: Float, departmentId: ID, managerId: ID): Employee!
    deleteEmployee(id: ID!): Boolean!
}
`
);


const employeeResolver = (employee) => {
    if (!employee) {
        return null;
    }   
    return {
        ...employee,            
        department: () => {
            console.log(`Buscando departamento para empleado ${employee.id}`);
            return departments.find(dep => dep.id === employee.departmentId);
        },
        
        manager: () => {
            console.log(`Buscando manager para empleado ${employee.id}`);
            const managerData = employees.find(emp => emp.id === employee.managerId);
            return employeeResolver(managerData); 
        }
    };
};

const root = {
    getEmployee: ({ id }) => {
        const employeeData = employees.find(emp => emp.id === parseInt(id));
        return employeeResolver(employeeData);
    },

    getAllEmployees: () => {
        return employees.map(employeeResolver);
    },

    getDepartment: ({ id }) => departments.find(dep => dep.id === parseInt(id)) || null,

    getAllDepartments: () => departments,

    createEmployee: ({ firstName, lastName, email, salary, departmentId, managerId }) => {
        const newEmployee = {
            id: employees.length ? employees[employees.length - 1].id + 1 : 1,
            firstName,
            lastName,
            email,
            salary,
            departmentId: parseInt(departmentId),
            managerId: managerId ? parseInt(managerId) : null,
        };
        employees.push(newEmployee);
        return employeeResolver(newEmployee);
    },

    updateEmployee: ({ id, firstName, lastName, email, salary, departmentId, managerId }) => {
        const employeeIndex = employees.findIndex(emp => emp.id === parseInt(id));
        if (employeeIndex === -1) throw new Error('Employee not found');
        
        const employeeData = employees[employeeIndex];
        employeeData.firstName = firstName !== undefined ? firstName : employeeData.firstName;
        employeeData.lastName = lastName !== undefined ? lastName : employeeData.lastName;
        employeeData.email = email !== undefined ? email : employeeData.email;
        employeeData.salary = salary !== undefined ? salary : employeeData.salary;
        employeeData.departmentId = departmentId !== undefined ? parseInt(departmentId) : employeeData.departmentId;
        employeeData.managerId = managerId !== undefined ? (managerId ? parseInt(managerId) : null) : employeeData.managerId;
        
        employees[employeeIndex] = employeeData;
        return employeeResolver(employeeData); 
    },

    deleteEmployee: ({ id }) => {
        const employeeIndex = employees.findIndex(emp => emp.id === parseInt(id));
        if (employeeIndex === -1) {
            return false;
        }
        employees.splice(employeeIndex, 1);
        return true;
    }
};

const app = express();

app.all('/graphql', createHandler({
    schema,
    rootValue: root,
}));

app.get('/', (req, res) => {
    res.type('html');
    res.end(ruruHTML({ endpoint: '/graphql' }));
});

app.listen(7777, () => {
    console.log('Running a GraphQL API server at http://localhost:7777');
});