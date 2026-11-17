# Diagnostic (apply for a pick, `git checkout` the two files after; the measures are hashed): the clothed depth of the arms
# in the body as BootTests.ArmsStayOutOfTheBody reads it (ArmClearance.Depth: the arm's points, sleeve out, against the
# body's points, clothes out), per state, with the arm's point that gave it: its part (0 the upper arm above its third by the
# elbow, 1 that third, 2 the forearm, 3 the hand), its sleeve's and the body's clothes there (cm). Logged as
# "ArmDepth: <person> <state> ..." when the probe goes.
import os
R="/home/user/second-face/unity/Assets/SecondFace/"
def edit(p, pairs):
    p=R+p; s=open(p).read()
    for a,b in pairs:
        assert s.count(a)==1,(p,a[:70]); s=s.replace(a,b)
    t=p+".tmp"; open(t,"w").write(s); os.replace(t,p)
edit("Game/People/ArmClearance.cs", [
("""        private float SkinDepth()
        {
            _skin.Pose();
            var deepest = 0f;
            foreach (var first in new[] { BodySkin.Part.UpperArmL, BodySkin.Part.UpperArmR })
                for (int i = _skin.Begin(first), to = _skin.End(first + 2); i < to; i++)
                    if (_skin.Depth(_skin.P[i], out var d, out _)) deepest = Mathf.Max(deepest, d);
            return deepest;
        }""",
"""        [System.NonSerialized] public int DepthAt = -1, DepthNear = -1, DepthPart = -1;
        [System.NonSerialized] public bool DepthResting;
        private float SkinDepth()
        {
            _skin.Pose();
            var deepest = 0f; DepthAt = DepthNear = DepthPart = -1; DepthResting = _restW > 0.99f;
            foreach (var first in new[] { BodySkin.Part.UpperArmL, BodySkin.Part.UpperArmR })
                for (int i = _skin.Begin(first), to = _skin.End(first + 2); i < to; i++)
                    if (_skin.Depth(_skin.P[i], out var d, out _) && d > deepest)
                    {
                        deepest = d; DepthAt = i; DepthNear = _skin.Near;
                        var lowerArm = first == BodySkin.Part.UpperArmL ? _ll : _rl; var upperArm = first == BodySkin.Part.UpperArmL ? _lu : _ru;
                        DepthPart = i >= _skin.Begin(first + 2) ? 3 : i >= _skin.Begin(first + 1) ? 2
                            : (_skin.P[i] - lowerArm.position).magnitude > (lowerArm.position - upperArm.position).magnitude / 3f ? 0 : 1;
                    }
            return deepest;
        }"""),
])
edit("Tests/PlayMode/MotionProbe.cs", [
("""        private void LateUpdate()
        {
            if (_a == null || _hp == null) return;""",
"""        private readonly Dictionary<string, (float D, string Where)> _armDepth = new();
        private void LateUpdate()
        {
            if (_a == null || _hp == null) return;
            if (Kind != null && State != null)
            {
                if (_ac == null) _ac = GetComponent<SecondFace.Game.People.ArmClearance>();
                if (_ac != null && _ac.SkinReady)
                {
                    var dd = _ac.Depth();
                    if (!_armDepth.TryGetValue(State, out var was) || dd > was.D)
                        _armDepth[State] = (dd, _ac.DepthAt < 0 ? "" : $"part {_ac.DepthPart} resting {_ac.DepthResting} sleeve {_ac.Skin.Off(_ac.DepthAt) * 100f:0.0} body {(_ac.DepthNear >= 0 ? _ac.Skin.Off(_ac.DepthNear) * 100f : -1f):0.0} at {(_ac.DepthNear >= 0 ? (_ac.Skin.P[_ac.DepthNear].y - transform.position.y) * 100f : 0f):0} cm up");
                }
            }"""),
("""            if (_baked != null) Destroy(_baked);
            _cv = null;""",
"""            foreach (var (st, (d, w)) in _armDepth) Debug.Log($"ArmDepth: {Person} {st}: {d * 100f:0.00} cm {w}");
            if (_baked != null) Destroy(_baked);
            _cv = null;"""),
])
print("ok")
