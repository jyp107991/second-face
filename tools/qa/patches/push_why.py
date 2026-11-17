# Applied after push_diag.py, for diagnosis only (take both back with git checkout before a whole-cast run: the
# measure files are hashed): adds whyL/whyR to the gate trace, the three body points that judged the arm point each
# side's first push was for (BodySkin.ExplainDepth: part, place from the shoulder in cm, normal, clothes, spacing, verdict).
# A push judged by points facing front, up or down rather than the side (the normal's x under 0.35 outward) is the
# skin's false contact, not the arm in the body (2026-11-16).
import os
R="/home/user/second-face/unity/Assets/SecondFace/"
def edit(p, pairs):
    p=R+p; s=open(p).read()
    for a,b in pairs:
        assert s.count(a)==1,(p,a[:70]); s=s.replace(a,b)
    t=p+".tmp"; open(t,"w").write(s); os.replace(t,p)
edit("Game/People/ArmClearance.cs", [
("""            var forUpper = _needAt >= _skin.Begin(first) && _needAt < _skin.Begin(first + 1);""",
 """            if (TraceStages) PushWhy[first == BodySkin.Part.UpperArmL ? 0 : 1] = need > 0f && _needAt >= 0 ? _skin.ExplainDepth(_skin.P[_needAt], upper.position, transform.rotation).Replace(',', ' ') + $" | flank {(_skin.Near >= 0 ? _skin.FlankMove(_skin.Near) * 100f : -1f):0.0}" : "";
            var forUpper = _needAt >= _skin.Begin(first) && _needAt < _skin.Begin(first + 1);"""),
("""        [System.NonSerialized] public int[] PushPart = { -1, -1 };""",
 """        [System.NonSerialized] public int[] PushPart = { -1, -1 };
        [System.NonSerialized] public string[] PushWhy = { "", "" };"""),
])
edit("Tests/PlayMode/MotionProbe.cs", [
(""" : ",,,,,,,,,,,,");""",
 """ : ",,,,,,,,,,,,") + (_ac != null ? $",\\"{_ac.PushWhy[0]}\\",\\"{_ac.PushWhy[1]}\\"" : ",,");"""),
])
edit("Tests/PlayMode/HumanMotionGateTests.cs", [
("""pbHR,pbOffR,pbDR,pbPartR\\n");""",
 """pbHR,pbOffR,pbDR,pbPartR,whyL,whyR\\n");"""),
])
print("ok")
