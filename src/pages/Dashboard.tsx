import { Dashboard as DashboardComponent } from "@/components/Dashboard";
import { Layout } from "@/components/ui/layout";
import { Navigation } from "@/components/Navigation";

const Dashboard = () => {
  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="p-6">
          <DashboardComponent />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;