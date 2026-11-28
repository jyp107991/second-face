using System.Collections.Generic;
using Unity.Collections;
using Unity.Jobs;
using Unity.Profiling;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Every person's arm clearance in one go (ArmClearance.Job.cs): after the animation, the foot plant, the gaze and the hands
    /// (order 9: before ArmClearance's own slot, 10, and the fight's hands, 30), each person the job can take is gathered on the
    /// main thread, all their jobs are scheduled together across the worker threads and completed, and their bones and reports
    /// set; anyone the job does not take (ArmClearance.JobWhyNot, counted by reason in ArmClearance.Fallbacks) runs the managed
    /// step in ArmClearance's own LateUpdate, as before.
    /// </summary>
    /// <summary>The job's profiler marker, on its own (a static Burst reads must not share a type with managed statics).</summary>
    internal static class ClearanceMarker
    {
        internal static readonly ProfilerMarker Step = new("ArmClearance.Step (job)");
    }

    [DefaultExecutionOrder(9)]
    public sealed class ClearanceSystem : MonoBehaviour
    {
        private static ClearanceSystem _me;
        private static readonly List<ArmClearance> All = new();
        private readonly List<ArmClearance> _taken = new();

        /// <summary>For the reports and the cost test: the main thread's time for the job's people (ms, summed over frames), the
        /// worker threads' time in the step itself (ms, summed), and the person-frames they covered.</summary>
        public static double MainMs, JobsMs;
        public static long PersonFrames;

        internal static ProfilerMarker StepMarker => ClearanceMarker.Step;
        private ProfilerRecorder _jobs;

        internal static void Join(ArmClearance a)
        {
            if (!All.Contains(a)) All.Add(a);
            if (_me != null || !Application.isPlaying) return;
            var go = new GameObject("arm clearance (jobs)");
            DontDestroyOnLoad(go);
            _me = go.AddComponent<ClearanceSystem>();
        }
        internal static void Leave(ArmClearance a) => All.Remove(a);

        private void OnEnable() => _jobs = ProfilerRecorder.StartNew(ProfilerCategory.Scripts, "ArmClearance.Step (job)", 1, ProfilerRecorderOptions.SumAllSamplesInFrame);
        private void OnDisable() { if (_jobs.Valid) _jobs.Dispose(); }
        private void OnDestroy() { if (_me == this) _me = null; }

        private void LateUpdate()
        {
            var t0 = System.Diagnostics.Stopwatch.GetTimestamp();
            if (_jobs.Valid && _jobs.LastValue > 0) JobsMs += _jobs.LastValue / 1e6;
            _taken.Clear();
            var handles = new NativeArray<JobHandle>(All.Count, Allocator.Temp);
            var n = 0;
            for (var i = All.Count - 1; i >= 0; i--) if (All[i] == null) All.RemoveAt(i);
            foreach (var a in All)
            {
                if (!a.isActiveAndEnabled) continue;
                var why = a.JobWhyNot();
                if (why != null) { a.NoteFallback(why); continue; }
                if (!a.Prepare(out var job)) { a.NoteFallback("the skin's arrays not made"); continue; }
                handles[n++] = job.Schedule();
                _taken.Add(a);
            }
            if (n > 0)
            {
                JobHandle.ScheduleBatchedJobs();
                JobHandle.CompleteAll(handles.GetSubArray(0, n));
                foreach (var a in _taken) a.Finish();
            }
            handles.Dispose();
            if (_taken.Count == 0) return;
            var ms = (System.Diagnostics.Stopwatch.GetTimestamp() - t0) * 1000.0 / System.Diagnostics.Stopwatch.Frequency;
            MainMs += ms; PersonFrames += _taken.Count;
            var share = ms / _taken.Count;
            foreach (var a in _taken) { a.CostMs += share; a.CostFrames++; }
        }
    }
}
