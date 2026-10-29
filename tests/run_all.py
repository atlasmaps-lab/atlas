"""Run every Atlas browser test (python tests/run_all.py); exits non-zero if any fails."""
import glob, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
# tests/test_*.py, plus each view's own tests in views/<id>/test_*.py (they import atlas_test from tests/)
tests = sorted(glob.glob(os.path.join(here, "test_*.py"))) + sorted(glob.glob(os.path.join(here, "..", "views", "*", "test_*.py")))
env = dict(os.environ, PYTHONPATH=here + os.pathsep + os.environ.get("PYTHONPATH", ""))
failed = [t for t in tests if subprocess.call([sys.executable, t], env=env) != 0]
print("\nAll tests passed." if not failed else "\nFailed: " + ", ".join(os.path.basename(t) for t in failed))
sys.exit(1 if failed else 0)
