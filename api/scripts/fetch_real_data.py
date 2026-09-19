"""Fetch REAL ocean surface currents (NASA OSCAR via NOAA ERDDAP) and convert
them to the Harmony engine's .npz format (keys: u, v, x, y).

The engine is dataset-agnostic — it only reads interpolated u/v arrays over a
0..50 x 0..50 domain. This script downloads a region's average surface currents,
rescales physical m/s speeds into engine units, and writes the npz so missions
run against real ocean physics instead of the synthetic double-gyre.

Usage:
    pip install xarray netCDF4 requests
    python api/scripts/fetch_real_data.py --region bay-of-bengal --write data/gulf_stream.npz

A backup of the previous (synthetic) field is kept as
data/gulf_stream_synthetic_backup.npz the first time you run this.
"""
from __future__ import annotations

import argparse
import os
import shutil
import tempfile

import numpy as np

# Region presets: name -> (lon_min, lon_max, lat_min, lat_max, label)
REGIONS = {
    "bay-of-bengal": (78.0, 98.0, 3.0, 22.0, "Bay of Bengal (Ganges outflow)"),
    "gulf-stream": (-80.0, -55.0, 26.0, 44.0, "Gulf Stream (NW Atlantic)"),
}

# Engine-units mapping: the synthetic field tops out around ~2.2 units/hr;
# scale real speed so its 95th percentile maps to that value.
TARGET_P95 = 2.2


def _fetch_dataset(lon: tuple, lat: tuple) -> "xr.Dataset":
    import requests  # noqa: PLC0415
    import xarray as xr  # noqa: PLC0415

    # Build griddap subset path: u[time][lat_max:lat_min][lon_min:lon_max]
    lon0, lon1, lat0, lat1 = lon[0], lon[1], lat[0], lat[1]
    subset = f"u[(0.0):1][({lat1}):({lat0}):1][({lon0}):({lon1}):1],v[(0.0):1][({lat1}):({lat0}):1][({lon0}):({lon1}):1]"
    url = f"https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdQAcurr_1day.nc?{subset}"

    print(f"==> Downloading OSCAR currents (1/3-degree, 5-day field)")
    print(f"    {url}")
    r = requests.get(url, timeout=180, stream=True)
    r.raise_for_status()
    with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as fh:
        for chunk in r.iter_content(1 << 20):
            fh.write(chunk)
        tmp = fh.name
    try:
        return xr.open_dataset(tmp)
    finally:
        os.unlink(tmp)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch real OSCAR currents -> Harmony .npz")
    parser.add_argument("--region", choices=REGIONS, default="bay-of-bengal")
    parser.add_argument("--write", default="data/gulf_stream.npz")
    args = parser.parse_args()
    lon = (REGIONS[args.region][0], REGIONS[args.region][1])
    lat = (REGIONS[args.region][2], REGIONS[args.region][3])
    label = REGIONS[args.region][4]

    ds = _fetch_dataset(lon, lat)
    u = ds["u"].values
    v = ds["v"].values
    # u[mask (=1, single 5-day field), time, lat, lon]
    while u.ndim > 2:
        u = u[0]
    while v.ndim > 2:
        v = v[0]
    u = u.astype(np.float32)
    v = v.astype(np.float32)

    # --- rescale m/s -> engine units/hr (target: p95 speed ~ TARGET_P95) ---
    speed = np.hypot(u, v)
    p95 = float(np.percentile(speed, 95)) or 1.0
    scale = TARGET_P95 / p95
    u_s = u * scale
    v_s = v * scale

    n_lon, n_lat = u_s.shape[1], u_s.shape[0]
    x = np.linspace(0.0, 50.0, n_lon).astype(np.float32)
    y = np.linspace(0.0, 50.0, n_lat).astype(np.float32)

    # ERDDAP returns lat DESC (north->south); flip to match y=0 at bottom.
    if ds["lat"][0] > ds["lat"][-1]:
        u_s = u_s[::-1, :]
        v_s = v_s[::-1, :]

    write = args.write
    os.makedirs(os.path.dirname(write) or ".", exist_ok=True)
    backup = "data/gulf_stream_synthetic_backup.npz"
    if os.path.exists(write) and not os.path.exists(backup):
        shutil.copyfile(write, backup)
        print(f"==> Backed up previous field -> {backup}")

    np.savez(write, u=u_s, v=v_s, x=x, y=y)
    print(f"==> Wrote {write}")
    print(f"    Region: {label}")
    print(f"    Grid:   {n_lat} x {n_lon} (lat x lon)")
    print(f"    Scale:  {scale:.3f} engine-units per m/s (p95 {p95:.3f} m/s -> {TARGET_P95})")
    print(f"    Speed range: {float(speed.min())*scale:.2f}..{float(speed.max())*scale:.2f} units/hr")
    print("Done. Re-run missions to use real currents.")


if __name__ == "__main__":
    main()