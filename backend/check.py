import cv2, os, glob
p = sorted(glob.glob("uploads/*"), key=os.path.getmtime)[-1]
print(p, os.path.getsize(p), "bytes")
cap = cv2.VideoCapture(p)
print("opened:", cap.isOpened(), "fps:", cap.get(cv2.CAP_PROP_FPS), "frames:", cap.get(cv2.CAP_PROP_FRAME_COUNT))
print("first read ok:", cap.read()[0])