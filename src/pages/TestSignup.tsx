import { useSearchParams } from "react-router-dom";

const TestSignup = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Signup Page Works!</h1>
        <p>Token: {token || 'No token provided'}</p>
      </div>
    </div>
  );
};

export default TestSignup;