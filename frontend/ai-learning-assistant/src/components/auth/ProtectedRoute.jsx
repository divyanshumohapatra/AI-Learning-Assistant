import React from 'react'
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../layout/AppLayout';
import { Outlet } from 'react-router-dom';
const ProtectedRoute = ()=>{
    
    const {isAuthenticated, loading} = useAuth();
    if(loading){
        return <div>Loading...</div>;
    }

    return isAuthenticated ?
    (
        <AppLayout>
            <Outlet/>
        </AppLayout>
    )
    :(
            <Navigate to='/login' replace/>
     );
};

export default ProtectedRoute