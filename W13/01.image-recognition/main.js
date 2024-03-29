$(document).ready(function () {
    //do something
    $("#thisButton").click(function () {
        processImage();
    });
    $("#inputImageFile").change(function (e) {
        processImageFile(e.target.files[0]);
    });
});

function processImage() {

    //確認區域與所選擇的相同或使用客製化端點網址
    var url = "https://eastus.api.cognitive.microsoft.com/";
    //v2.1:版本號、analyze:子功能
    var uriBase = url + "vision/v2.1/analyze";
    // var uriBase = url + "vision/v2.1/describe";

    var params = {
        "visualFeatures": "Objects,Faces,Adult,Brands,Categories,Description,Color",
        "details": "",
        // "maxCandidates": "10",
        // "language": "zh",
    };
    //先抓取再分析
    //顯示分析的圖片
    var sourceImageUrl = document.getElementById("inputImage").value;
    document.querySelector("#sourceImage").src = sourceImageUrl;
    //送出分析
    $.ajax({
        url: uriBase + "?" + $.param(params),
        // Request header
        beforeSend: function (xhrObj) {
            xhrObj.setRequestHeader("Content-Type", "application/json");
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", subscriptionKey);
        },
        type: "POST",
        // Request body
        data: '{"url": ' + '"' + sourceImageUrl + '"}',
    })
        .done(function (data) {
            //顯示JSON內容
            $("#responseTextArea").val(JSON.stringify(data, null, 2));

            var categoryName = data.categories[0].name; // 獲取類別名稱
            if (categoryName.includes("animal")) {
                var animalName = categoryName.split("_")[1];
                console.log(animalName);
                $("#showAnimalResult").text(animalName);
            } else {
                console.log("圖中沒有動物");
                $("#showAnimalResult").text("圖中沒有動物");
            }

            $("#picDescription").empty();
            // for (var x = 0; x < data.description.captions.length; x++) {
            //     $("#picDescription").append(data.description.captions[0].text + "<br>");
            //     // $("#picDescription").append("這張圖片有 " + data.faces.length + " 個人");
            // }
            $("#picDescription").text(data.description.captions[0].text);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            //丟出錯誤訊息
            var errorString = (errorThrown === "") ? "Error. " : errorThrown + " (" + jqXHR.status + "): ";
            errorString += (jqXHR.responseText === "") ? "" : jQuery.parseJSON(jqXHR.responseText).message;
            alert(errorString);
        });
};

function processImageFile(imageObject) {

    //確認區域與所選擇的相同或使用客製化端點網址
    var url = "https://eastus.api.cognitive.microsoft.com/";
    //v2.1:版本號、analyze:子功能
    // var uriBase = url + "vision/v2.1/analyze";
    var uriBase = url + "vision/v2.1/describe";

    var params = {
        "visualFeatures": "Objects,Faces,Adult,Brands,Categories,Description,Color",
        "details": "",
        // "maxCandidates": "10",
        // "language": "zh",
    };
    //先抓取再分析
    //顯示分析的圖片
    var sourceImageUrl = URL.createObjectURL(imageObject);
    document.querySelector("#sourceImage").src = sourceImageUrl;
    //送出分析
    $.ajax({
        url: uriBase + "?" + $.param(params),
        // Request header
        beforeSend: function (xhrObj) {
            xhrObj.setRequestHeader("Content-Type", "application/octet-stream");
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", subscriptionKey);
        },
        type: "POST",
        processData: false,
        contentType: false,
        // Request body
        data: imageObject,
    })
        .done(function (data) {
            //顯示JSON內容
            $("#responseTextArea").val(JSON.stringify(data, null, 2));
            $("#picDescription").empty();
            for (var x = 0; x < data.description.captions.length; x++) {
                $("#picDescription").append(data.description.captions[0].text + "<br>");
                // $("#picDescription").append("這張圖片有 " + data.faces.length + " 個人");
            }
            // $("#picDescription").text(data.description.captions[0].text);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            //丟出錯誤訊息
            var errorString = (errorThrown === "") ? "Error. " : errorThrown + " (" + jqXHR.status + "): ";
            errorString += (jqXHR.responseText === "") ? "" : jQuery.parseJSON(jqXHR.responseText).message;
            alert(errorString);
        });
};