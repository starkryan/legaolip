'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Smartphone, LogIn, Mail, Lock, Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { signIn } from '@/lib/auth-client';

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError('');

    try {
      await signIn(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
         
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to access your GOIP Dashboard
          </p>
        </div>

        <Card className="border-0 shadow-xl">
         

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@company.com"
                          className="h-11 pl-10 border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="h-11 pl-10 pr-10 border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                            disabled={isLoading}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-muted-foreground/20 text-primary focus:ring-primary/20"
                    />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary hover:text-primary/80 text-sm"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-4">
                <Button
                  type="submit"
                  className="w-full h-11 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/30 transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Separator className="my-2" />

                <div className="flex flex-col space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?
                  </p>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => router.push('/signup')}
                    className="w-full h-11 border-muted-foreground/20 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                    disabled={isLoading}
                  >
                    <span className="mr-2">Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Security Notice */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="h-3 w-3" />
            Secure connection • Your data is protected
          </p>
        </div>
      </div>
    </div>
  );
}
