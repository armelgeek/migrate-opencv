from setuptools import setup, find_packages
import os, re

with open("README.md", "r") as fh:
    long_description = fh.read()


def get_version() -> str:
    """Get __version__ from version.py file."""
    version_file = os.path.join(os.path.dirname(__file__), "kivg", "version.py")
    version_file_data = open(version_file, "rt", encoding="utf-8").read()
    version_regex = r"(?<=^__version__ = ['\"])[^'\"]+(?=['\"]$)"
    try:
        version = re.findall(version_regex, version_file_data, re.M)[0]
        return version
    except IndexError:
        raise ValueError(f"Unable to find version string in {version_file}.")


setup(
    name="Kivg",
    version=get_version(),
    packages=find_packages(),
    package_data={"kivg": ["*.py", "animation/*.py", "drawing/*.py", "core/*.py", "rendering/*.py", "export/*.py"]},
    # metadata to display on PyPI
    author="Shashi Ranjan",
    author_email="shashiranjankv@gmail.com",
    description="SVG path drawing and animation support using OpenCV (headless)",
    long_description=long_description,
    long_description_content_type="text/markdown",
    keywords="svg svg-animations svg-path svg-images opencv python headless",
    url="https://github.com/shashi278/svg-anim-kivy",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent"
    ],
    install_requires=[
        "opencv-python-headless>=4.8.0",
        "numpy>=1.24.0",
        "svg.path==4.1",
    ],
    extras_require={
        "gif": ["imageio>=2.31.0"],
    },
    python_requires=">=3.8",
)