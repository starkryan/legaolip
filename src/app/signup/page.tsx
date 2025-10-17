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
import { Loader2, Smartphone, UserPlus, Mail, Lock, User, Shield, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { signUp } from '@/lib/auth-client';

const passwordRequirements = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[A-Z]/, text: "One uppercase letter" },
  { regex: /[a-z]/, text: "One lowercase letter" },
  { regex: /[0-9]/, text: "One number" },
];

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }).max(50, {
    message: "Name must be less than 50 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchPassword = form.watch("password");
  const passwordStrength = passwordRequirements.filter(req => req.regex.test(watchPassword || "")).length;

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "text-red-500";
    if (passwordStrength <= 2) return "text-orange-500";
    if (passwordStrength <= 3) return "text-yellow-500";
    if (passwordStrength <= 4) return "text-green-500";
    return "text-green-600";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 2) return "Fair";
    if (passwordStrength <= 3) return "Good";
    if (passwordStrength <= 4) return "Strong";
    return "Very Strong";
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError('');

    try {
      await signUp(data.email, data.password, data.name);
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
         
          <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
          <p className="text-muted-foreground">
            Join GOIP Dashboard and start managing your SMS gateway
          </p>
        </div>

        <Card className="border-0 shadow-xl">
     

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
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
                            placeholder="Create a strong password"
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

                      {/* Password Strength Indicator */}
                      {watchPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Password strength:</span>
                            <span className={`font-medium ${getPasswordStrengthColor()}`}>
                              {getPasswordStrengthText()}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded-full ${
                                  level <= passwordStrength
                                    ? level <= 2
                                      ? "bg-orange-500"
                                      : level <= 3
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                    : "bg-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="space-y-1">
                            {passwordRequirements.map((req, index) => (
                              <div
                                key={index}
                                className={`flex items-center gap-2 text-xs ${
                                  req.regex.test(watchPassword || "")
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {req.regex.test(watchPassword || "") ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                <span>{req.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="h-11 pl-10 pr-10 border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                            disabled={isLoading}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isLoading}
                          >
                            {showConfirmPassword ? (
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

                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="terms"
                    className="rounded border-muted-foreground/20 text-primary focus:ring-primary/20"
                    required
                  />
                  <label htmlFor="terms" className="text-muted-foreground">
                    I agree to the{' '}
                    <Button variant="link" className="h-auto p-0 text-primary hover:text-primary/80 text-sm">
                      Terms of Service
                    </Button>{' '}
                    and{' '}
                    <Button variant="link" className="h-auto p-0 text-primary hover:text-primary/80 text-sm">
                      Privacy Policy
                    </Button>
                  </label>
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
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Separator className="my-2" />

                <div className="flex flex-col space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?
                  </p>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => router.push('/login')}
                    className="w-full h-11 border-muted-foreground/20 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                    disabled={isLoading}
                  >
                    <span className="mr-2">Sign In</span>
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
            Secure connection • Your data is encrypted and protected
          </p>
        </div>
      </div>
    </div>
  );
}
