import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  HCM Lite — AI-assisted Human Capital Management System")
    print("  Server starting at: http://localhost:8000")
    print("  API Docs available at: http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
