// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ChewbuuSync",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .executable(name: "ChewbuuSync", targets: ["ChewbuuSync"])
    ],
    dependencies: [
        .package(url: "https://github.com/aws-devtools-labs/aws-blocks-swift.git", from: "0.1.0")
    ],
    targets: [
        .executableTarget(
            name: "ChewbuuSync",
            dependencies: [
                .product(name: "BlocksRuntime", package: "aws-blocks-swift")
            ],
            resources: [
                .process("Resources")
            ],
            plugins: [
                .plugin(name: "BlocksCodegenBuildPlugin", package: "aws-blocks-swift")
            ]
        ),
        .testTarget(
            name: "ChewbuuSyncTests",
            dependencies: ["ChewbuuSync"]
        )
    ]
)
