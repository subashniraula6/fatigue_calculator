import React, { useState } from "react";
import "./upload.style.css";

const Upload = ({fileContent, setFileContent}) => {
    const styles = {
    fontFamily: "sans-serif",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    margin: "30px",
  };
  function handleFileChange(e) {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
        setFileContent(JSON.parse(e.target.result));
    };
  }
  return (
    <>
      <div style={styles}>
        <label className="custom-file-upload">
          <input type="file" multiple onChange={handleFileChange} />
          <i className="fa fa-cloud-upload" /> Attach
        </label>
        <div className="file-preview">Upload Ruleset</div>
      </div>
      <div>
        <h6>Ruleset: {fileContent && fileContent['ruleSetName'] ? fileContent['ruleSetName']: ""}</h6>
      </div>
    </>
  );
};

export default Upload;
