import fitz

def extract_text(file_content):
    document = fitz.open(stream=file_content, filetype = "pdf")
    text = ""

    for page in document:
        text += page.get_text()
    document.close()

    return text

if __name__ == "__main__":
    text = extract_text("Bivin_B_resume.pdf")
    print(text)