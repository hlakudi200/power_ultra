import { WorkoutPlan } from "@/components/WorkoutPlan";

const WorkoutPlanPage = () => {
  return (
    <div className="min-h-screen bg-gradient-dark py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2">
            My <span className="text-primary">Workout Plan</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Your personalized training program created by your coach
          </p>
        </div>

        {/* Workout Plan Component */}
        <WorkoutPlan />
      </div>
    </div>
  );
};

export default WorkoutPlanPage;
