import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Receipt,
  BookOpen,
  Bell,
  Settings,
  Menu,
  X,
  Cloud,
  TrendingUp,
  LogOut,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const navigation = [
  {
    name: "My Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: Users
  },
  {
    name: "Transactions",
    href: "/transactions", 
    icon: Receipt
  },
  {
    name: "Cashbook",
    href: "/cashbook",
    icon: BookOpen
  },
  {
    name: "Reports",
    href: "/reports",
    icon: TrendingUp
  },
  {
    name: "Reminders",
    href: "/reminders",
    icon: Bell
  }
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Signed out successfully"
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-6 left-6 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-xl"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 modern-sidebar transform transition-transform duration-300 ease-in-out md:translate-x-0 rounded-r-3xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          {/* User Profile */}
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mr-4">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Welcome</h3>
              <p className="text-white/70 text-sm">LedgerFlow User</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group",
                    isActive
                      ? "bg-white/20 text-white backdrop-blur-sm"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 mr-4 transition-transform duration-300",
                    isActive ? "scale-110" : "group-hover:scale-105"
                  )} />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="space-y-2 pt-6 border-t border-white/20">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group",
                location.pathname === "/settings"
                  ? "bg-white/20 text-white backdrop-blur-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <Settings className={cn(
                "h-5 w-5 mr-4 transition-transform duration-300",
                location.pathname === "/settings" ? "scale-110" : "group-hover:scale-105"
              )} />
              Settings
              {location.pathname === "/settings" && (
                <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>
              )}
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group text-white/70 hover:text-white hover:bg-white/10 w-full"
            >
              <LogOut className="h-5 w-5 mr-4 transition-transform duration-300 group-hover:scale-105" />
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}