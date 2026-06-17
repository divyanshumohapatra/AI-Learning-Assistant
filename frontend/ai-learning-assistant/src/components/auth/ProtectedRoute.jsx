import React from 'react'
import { useAuth } from '../../context/AuthContext';

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