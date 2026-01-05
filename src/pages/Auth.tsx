import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  BarChart3,
  Eye,
  EyeOff,
  TrendingUp,
  Users,
  DollarSign,
  UserCog,
} from "lucide-react";
import { motion } from "framer-motion";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isStaffLogin, setIsStaffLogin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if this is a staff login
      if (isStaffLogin && data.user) {
        const { data: staffData, error: staffError } = await supabase
          .from("staff_accounts")
          .select("*")
          .eq("staff_user_id", data.user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (staffError || !staffData) {
          await supabase.auth.signOut();
          toast.error("This is not a valid staff account or it has been deactivated");
          setLoading(false);
          return;
        }

        toast.success(`Welcome back, ${staffData.staff_name}!`);
      } else {
        toast.success("Signed in successfully!");
      }

      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Error signing in");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset email sent!");
      setForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Error sending reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#DC2626] text-white relative overflow-hidden">

      {/* ================= LEFT: BUSINESS VISUAL PANEL ================= */}
      <div className="hidden md:flex relative items-center justify-center p-16 overflow-hidden">

        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:28px_28px] opacity-30" />

        {/* Floating business icons */}
        <motion.div
          className="absolute top-[18%] left-[12%] text-white/20"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <BarChart3 size={70} />
        </motion.div>

        <motion.div
          className="absolute bottom-[22%] left-[28%] text-white/15"
          animate={{ y: [0, -28, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        >
          <TrendingUp size={80} />
        </motion.div>

        <motion.div
          className="absolute top-[25%] right-[15%] text-white/10"
          animate={{ y: [0, -24, 0] }}
          transition={{ duration: 7, repeat: Infinity }}
        >
          <Users size={84} />
        </motion.div>

        <motion.div
          className="absolute bottom-[10%] right-[25%] text-white/10"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 9, repeat: Infinity }}
        >
          <DollarSign size={64} />
        </motion.div>

        {/* Text content */}
        <motion.div
          className="relative z-10 max-w-xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-extrabold leading-tight mb-6">
            Run Your Business <br /> Like a Pro
          </h1>
          <h2 className="text-2xl font-semibold mb-6 opacity-90">
            CRM built for founders, teams & scale.
          </h2>
          <p className="text-lg opacity-85 leading-relaxed">
            Manage leads, customers, sales, billing and insights from one
            powerful CRM platform designed for growing businesses.
          </p>
        </motion.div>
      </div>

      {/* ================= RIGHT: LOGIN CARD ================= */}
      <div className="flex items-center justify-center p-8 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl shadow-2xl bg-white text-black">
            <CardHeader className="text-center space-y-2">
              <div className={`mx-auto p-3 rounded-xl w-fit ${isStaffLogin ? 'bg-blue-600' : 'bg-red-600'}`}>
                {isStaffLogin ? (
                  <UserCog className="h-8 w-8 text-white" />
                ) : (
                  <BarChart3 className="h-8 w-8 text-white" />
                )}
              </div>

              <CardTitle className="text-3xl font-bold">
                Eduvanca One
              </CardTitle>
              <CardDescription>
                {forgotPassword 
                  ? "Reset your password" 
                  : isStaffLogin 
                    ? "Staff Login - Limited access account" 
                    : "Sign in to your account"
                }
              </CardDescription>

              {/* Staff Login Toggle */}
              {!forgotPassword && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Label htmlFor="staff-mode" className="text-sm text-muted-foreground cursor-pointer">
                    Admin
                  </Label>
                  <Switch
                    id="staff-mode"
                    checked={isStaffLogin}
                    onCheckedChange={setIsStaffLogin}
                  />
                  <Label htmlFor="staff-mode" className="text-sm text-muted-foreground cursor-pointer">
                    Staff
                  </Label>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {!forgotPassword ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={isStaffLogin ? "staff@company.com" : "admin@company.com"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm text-red-600"
                      onClick={() => setForgotPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className={`w-full ${isStaffLogin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : isStaffLogin ? "Sign In as Staff" : "Sign In"}
                  </Button>

                  {isStaffLogin && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Staff accounts are created by administrators. Contact your admin if you need access.
                    </p>
                  )}
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setForgotPassword(false)}>
                      Back
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700" type="submit">
                      Send Reset Link
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;