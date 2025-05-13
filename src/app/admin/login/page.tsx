
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      setError("Firebase Auth is not initialized. Please check the console.");
      setIsCheckingAuth(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/admin");
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!auth) {
      setError("Firebase Auth is not available. Login failed.");
      setIsLoading(false);
      return;
    }
    
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        setError("Admin credentials are not configured in environment variables. Please set NEXT_PUBLIC_ADMIN_EMAIL and NEXT_PUBLIC_ADMIN_PASSWORD.");
        setIsLoading(false);
        return;
    }

    if (email !== adminEmail) {
        setError("Invalid admin email.");
        setIsLoading(false);
        return;
    }


    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle redirect
      router.push("/admin");
    } catch (e: any) {
      console.error("Login failed:", e);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (e.code === 'auth/invalid-email') {
        setError("The email address is not valid.");
      }
       else {
        setError("An unexpected error occurred during login. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <LogIn className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Admin Login</CardTitle>
          <CardDescription>Access the MediSearch Admin Dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Logging In...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
                Ensure you have the correct admin credentials. Contact support if you face issues.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
