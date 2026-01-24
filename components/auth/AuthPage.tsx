import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Cpu, ArrowRight, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const AuthPage: React.FC = () => {
    const { signInWithGoogle, session } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in
    useEffect(() => {
        if (session) {
            navigate('/dashboard');
        }
    }, [session, navigate]);

    const handleLogin = async () => {
        await signInWithGoogle();
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background text-text-primary">
            {/* Left: Branding & Value Prop */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-surface/30 relative overflow-hidden text-white border-r border-white/5">
                <div className="absolute inset-0 bg-primary/5 z-0" />
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[150px] animate-pulse-slow" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-gradient-to-tr from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Cpu className="text-white w-6 h-6" />
                        </div>
                        <span className="font-display font-bold text-2xl tracking-tight">Cognition AI</span>
                    </div>

                    <h1 className="text-5xl font-display font-bold mb-6 leading-tight">
                        Master your brand's <br />
                        <span className="text-gradient">AI perception.</span>
                    </h1>
                    <p className="text-xl text-text-secondary max-w-md leading-relaxed">
                        Join 2,000+ forward-thinking brands optimizing their visibility in ChatGPT, Claude, and Gemini.
                    </p>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-surfaceHighlight rounded-full flex items-center justify-center border border-white/10">
                            <span className="font-bold text-lg">4.9</span>
                        </div>
                        <div>
                            <div className="flex text-amber-400 text-sm mb-1">★★★★★</div>
                            <div className="text-sm text-text-secondary font-medium">Rated top GEO tool by Product Hunt</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="flex items-center justify-center p-6 lg:p-12 relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="w-full max-w-md space-y-8 relative z-10">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
                        <p className="text-text-secondary">Sign in to your dashboard to continue.</p>
                    </div>

                    <Card variant="glass" className="p-8 space-y-6 border-white/10 shadow-2xl">
                        <Button
                            onClick={handleLogin}
                            size="lg"
                            variant="secondary"
                            className="w-full h-14 text-base font-medium flex items-center justify-center gap-3 bg-white text-black hover:bg-slate-100 hover:text-black transition-all"
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                            Continue with Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-surface/50 px-2 text-text-muted backdrop-blur-md">Or</span>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {['Real-time Site Crawling', 'Multi-LLM Analysis', 'Vector Rewrite Simulator'].map((feat, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-text-secondary">
                                    <Check className="w-4 h-4 text-primary" />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <p className="text-center text-xs text-text-muted">
                        By continuing, you agree to our <a href="/terms" className="underline hover:text-white">Terms of Service</a> and <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};
