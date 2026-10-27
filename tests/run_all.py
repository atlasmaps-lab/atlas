"""Run every Atlas browser test (python tests/run_all.py); exits non-zero if any fails."""
import glob, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
failed = [t for t in sorted(glob.glob(os.path.join(here, "test_*.py"))) if subprocess.call([sys.executable, t]) != 0]
print("\nAll tests passed." if not failed else "\nFailed: " + ", ".join(os.path.basename(t) for t in failed))
sys.exit(1 if failed else 0)
