import os
# body_slim.py's import step: RocketboxImportPostprocessor applies <id>_slim.bytes to the body's mesh before anything is
# measured from it (held, not applied: see body_slim.py)
p=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'unity/Assets/SecondFace/Editor/Build/RocketboxImportPostprocessor.cs')
s=open(p).read()
old='''        private void OnPostprocessModel(GameObject root)
        {
            if (!assetPath.StartsWith(People)) return;
            // each vertex's height on the body, along the mesh's tallest axis (the 3ds Max export stands the bind pose on
            // its own axes), 0 at the lowest vertex of all the person's meshes, 1 at the highest
            var meshes = root.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (meshes.Length == 0) return;'''
new='''        private void OnPostprocessModel(GameObject root)
        {
            if (!assetPath.StartsWith(People)) return;
            var meshes = root.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (meshes.Length == 0) return;
            // the slimmed sleeves, where a base has them (BodySlim, beside the FBX): first, so everything measured from the
            // body's mesh (its heights, the flank correctives, the skin points and the layers) is measured on them
            var slimBody = BodySlim.Body(root);
            var slim = BodySlim.PathFor(assetPath);
            if (slimBody != null && System.IO.File.Exists(slim))
            {
                context.DependsOnSourceAsset(slim);
                var (dp, dn) = BodySlim.ReadFor(assetPath, slimBody.sharedMesh.vertexCount);
                if (dp == null) Debug.LogWarning($"RocketboxImportPostprocessor: {slim} is not for {assetPath}'s body ({slimBody.sharedMesh.vertexCount} vertices)");
                else BodySlim.Apply(slimBody.sharedMesh, dp, dn);
            }
            // each vertex's height on the body, along the mesh's tallest axis (the 3ds Max export stands the bind pose on
            // its own axes), 0 at the lowest vertex of all the person's meshes, 1 at the highest'''
assert old in s; s=s.replace(old,new)
s=s.replace('public override uint GetVersion() => 3;','public override uint GetVersion() => 4;')
open(p,'w').write(s)
print('patched')
