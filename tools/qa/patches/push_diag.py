import os
R="/home/user/second-face/unity/Assets/SecondFace/"
def edit(p, pairs):
    p=R+p; s=open(p).read()
    for a,b in pairs:
        assert s.count(a)==1,(p,a[:70]); s=s.replace(a,b)
    t=p+".tmp"; open(t,"w").write(s); os.replace(t,p)
edit("Game/People/ArmClearance.cs", [
("""                best = a; axis = ax.normalized; _needAt = i;""",
 """                best = a; axis = ax.normalized; _needAt = i; _needNear = _skin.Near; _needDepth = d;"""),
("""        private int _needFirst = -1;""",
 """        private int _needFirst = -1, _needNear = -1, _needNearFirst = -1;
        private float _needDepth, _needDepthFirst;
        /// <summary>For the gate's trace: the body's point the shoulder's first push was against (left 0, right 1): its height
        /// over the hips (cm), how far its clothes stand off the skin there (cm), how deep the arm's point was past it after
        /// the gives (cm), and the body's part (0 torso, 1 a thigh).</summary>
        [System.NonSerialized] public float[] PushBody = new float[8];"""),
("""            _needFirst = need > 0f ? _needAt : -1;""",
 """            _needFirst = need > 0f ? _needAt : -1; _needNearFirst = need > 0f ? _needNear : -1; _needDepthFirst = _needDepth;"""),
("""                if (pushed <= 0.01f || _needFirst < 0) PushPart[k] = -1;""",
 """                var nb = _needNearFirst;
                PushBody[k * 4] = nb >= 0 && _hips != null ? (_skin.P[nb].y - _hips.position.y) * 100f : 0f;
                PushBody[k * 4 + 1] = nb >= 0 ? _skin.Off(nb) * 100f : 0f;
                PushBody[k * 4 + 2] = nb >= 0 ? _needDepthFirst * 100f : 0f;
                PushBody[k * 4 + 3] = nb >= 0 ? (_skin.PartOf(nb) == BodySkin.Part.Torso ? 0f : 1f) : -1f;
                if (pushed <= 0.01f || _needFirst < 0) PushPart[k] = -1;"""),
])
edit("Tests/PlayMode/MotionProbe.cs", [
("""$",{_ac.PushPart[0]},{_ac.PushDeg[0]:0.0},{_ac.PushPart[1]},{_ac.PushDeg[1]:0.0}" : ",,,,");""",
 """$",{_ac.PushPart[0]},{_ac.PushDeg[0]:0.0},{_ac.PushPart[1]},{_ac.PushDeg[1]:0.0}," + string.Join(",", _ac.PushBody.Select(x => x.ToString("0.0"))) : ",,,,,,,,,,,,");"""),
])
edit("Tests/PlayMode/HumanMotionGateTests.cs", [
("""sink,pushPartL,pushDegL,pushPartR,pushDegR\\n");""",
 """sink,pushPartL,pushDegL,pushPartR,pushDegR,pbHL,pbOffL,pbDL,pbPartL,pbHR,pbOffR,pbDR,pbPartR\\n");"""),
])
print("ok")
